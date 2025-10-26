'use client';

import ImageCard from '../../../components/ImageCard';
import ImageCardModal from '../../../components/ImageCardModal';
import { useEffect, useState } from 'react';
import {
  createReplicateJob,
  getJobStatus,
  getUserHistory,
  getReplicateModels,
  mapApiToUiJob,
  normalizeUrl,
} from '../../../lib/api';
import type { UiJob } from '../../../types/image-job';
import { useAuth } from '../../../context/AuthContext';
import { useImageHistory } from '../../../hooks/useImageHistory';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Problem, mapProblemToUI } from '../../../lib/errors';
import { toast } from '../../../lib/toast';
import OutOfCreditsDialog from '../../../components/OutOfCreditsDialog';
import UpgradePlanDialog from '../../../components/UpgradePlanDialog';
import { useParams, useRouter } from 'next/navigation';
import ResendVerificationDialog from '../../../components/ResendVerificationDialog';

const aspectRatioOptions = [
  { value: '1:1', label: 'Square', helper: 'Social posts' },
  { value: '9:16', label: 'Portrait', helper: 'Stories & reels' },
  { value: '16:9', label: 'Landscape', helper: 'Decks & video stills' },
];

const promptSuggestions = [
  {
    title: 'Neon city portrait',
    prompt:
      'Cinematic portrait of a cyberpunk explorer lit by neon reflections, ultra-detailed, 85mm photo',
  },
  {
    title: 'Product spotlight',
    prompt:
      'Minimalist product render of a smart home speaker on a marble table, dramatic studio lighting',
  },
  {
    title: 'Floating lab concept',
    prompt:
      'Concept art of a floating botanical laboratory above the clouds, illustrated in watercolor style',
  },
];

export default function ModelPage() {
  const params = useParams<{ modelId?: string }>();
  const routeModelId = params?.modelId ?? 'flux-dev';
  const selectedModelId =
    routeModelId && routeModelId.toLowerCase() === 'replicate' ? 'flux-dev' : routeModelId;
  const [prompt, setPrompt] = useState('');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1');
  const [quality, setQuality] = useState(3);
  const [images, setImages] = useState<UiJob[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [outOfCredits, setOutOfCredits] =
    useState<{ current?: number; needed?: number } | null>(null);
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const { token } = useAuth();
  const { history, setHistory } = useImageHistory();
  const [currentPage, setCurrentPage] = useState(1);
  const [modelInfo, setModelInfo] = useState<
    { id: string; title: string; description: string } | null
  >(null);
  const ITEMS_PER_PAGE = 10;
  const router = useRouter();

  useEffect(() => {
    getReplicateModels()
      .then(models => {
        const info =
          models.find(m => m.id === routeModelId) ??
          models.find(m => m.id === selectedModelId) ??
          null;
        setModelInfo(info);
      })
      .catch(() => {
        setModelInfo(null);
      });
  }, [routeModelId, selectedModelId]);

  useEffect(() => {
    if (!history) return;
    const ui = history
      .map(mapApiToUiJob)
      .filter(j => !!j.url);

    setImages(ui);
    setCurrentPage(1);

    if (ui.length > 0) {
      setSelectedImageUrl(ui[0].url ?? null);
      setSelectedJobId(ui[0].id);
    } else {
      setSelectedImageUrl(null);
      setSelectedJobId(null);
    }
  }, [history]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    if (!token) {
      console.warn('User not authenticated');
      return;
    }

    setLoading(true);
    setSelectedImageUrl(null);
    setSelectedJobId(null);
    try {
      const jobId = await createReplicateJob(
        prompt,
        selectedAspectRatio,
        quality,
        selectedModelId,
      );
      const newJob: UiJob = {
        id: jobId,
        status: 'loading',
        url: null,
        aspectRatio: selectedAspectRatio,
      };

      setImages((prev: UiJob[]) => [newJob, ...prev]);
      setCurrentPage(1);

      const poll = setInterval(async () => {
        try {
          const content = await getJobStatus(jobId);
          if (!content) return;
          const status = content.status?.toUpperCase();

          const rawUrl =
            content.imageUrl ?? (Array.isArray(content.imageUrls) ? content.imageUrls[0] : null);

          if (status === 'COMPLETED') {
            clearInterval(poll);

            const fullUrl = normalizeUrl(rawUrl);

            setImages((prev: UiJob[]) =>
              prev.map((j: UiJob) => (j.id === jobId ? { ...j, status: 'done', url: fullUrl } : j))
            );
            setSelectedImageUrl(fullUrl);
            setSelectedJobId(jobId);

            try {
              const updatedHistory = await getUserHistory();
              setHistory(updatedHistory);
            } catch (historyError) {
              console.warn('Failed to update history:', historyError);
            }

            window.dispatchEvent(new Event('creditsUpdated'));
            setLoading(false);
          }

          if (status === 'FAILED') {
            clearInterval(poll);
            setImages(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'done' } : j)));
            setLoading(false);
          }
        } catch (pollError) {
          console.error('Polling error:', pollError);
          clearInterval(poll);
          setLoading(false);
        }
      }, 2000);
    } catch (err) {
      const problem = err as Problem;
      const action = mapProblemToUI(problem);
      if (problem.code === 'EMAIL_NOT_VERIFIED') {
        setEmailModal(true);
      } else if (action.kind === 'toast') {
        toast(action.message);
      } else if (action.kind === 'modal') {
        if (problem.code === 'INSUFFICIENT_CREDITS') {
          setOutOfCredits(problem.meta as { current?: number; needed?: number });
        } else if (problem.code === 'FORBIDDEN_FEATURE') {
          setUpgradeDialog(true);
        }
      } else if (action.kind === 'redirect' && action.cta) {
        toast(action.message);
        router.push(action.cta);
      }
      setLoading(false);
    }
  }

  const centerImageUrl = selectedImageUrl;
  const doneImages = images.filter(img => img.status === 'done' && img.url);
  const totalPages = Math.max(Math.ceil(doneImages.length / ITEMS_PER_PAGE), 1);
  const paginatedImages = doneImages.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const showCenterOnMobile = !!centerImageUrl || loading;

  return (
    <div className="flex h-full flex-1 flex-col lg:flex-row lg:items-start animate-fade-in">
      <div className="w-full lg:w-[480px] flex-shrink-0 p-3 sm:p-4 md:p-6 flex flex-col h-auto lg:h-full bg-black/40 backdrop-blur-lg animate-fade-in">
        <div className="flex flex-col gap-5 md:gap-6 lg:flex-1">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-purple-500/10">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-fuchsia-100">
                {modelInfo?.title ?? 'imagino.AI studio'}
              </span>
              <span className="text-[11px] text-gray-400">Credits update live</span>
            </div>
            {modelInfo?.description && (
              <p className="mt-2 text-xs text-gray-400">{modelInfo.description}</p>
            )}
            <p className="mt-3 text-sm text-gray-200">
              Use the creative brief below to guide lighting, composition, and brand voice before generating.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label htmlFor="prompt" className="text-sm font-medium text-gray-200">
                Creative brief
              </label>
              <span className="text-[11px] text-gray-500">Add subject, mood &amp; camera details</span>
            </div>
            <textarea
              id="prompt"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the scene, subject, style, and lighting you want to see..."
              className="h-40 sm:h-48 md:h-72 resize-none rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-white shadow-lg transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 placeholder:text-gray-500"
            />
            <div className="flex flex-wrap gap-2">
              {promptSuggestions.map(suggestion => (
                <button
                  key={suggestion.title}
                  type="button"
                  onClick={() => setPrompt(suggestion.prompt)}
                  className="group flex-1 min-w-[160px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-gray-200 transition hover:border-fuchsia-400/40 hover:bg-white/10"
                >
                  <span className="block text-xs font-semibold text-white">{suggestion.title}</span>
                  <span className="mt-1 block text-[11px] text-gray-400 group-hover:text-gray-200">
                    {suggestion.prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Aspect ratio</p>
              <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500">{selectedAspectRatio}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {aspectRatioOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedAspectRatio(option.value)}
                  className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                    selectedAspectRatio === option.value
                      ? 'border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/30 via-purple-500/20 to-cyan-400/20 text-white'
                      : 'border-white/10 bg-black/30 text-gray-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-1 block text-[11px] text-gray-400">
                    {option.helper}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Quality priority</p>
              <span className="text-xs text-gray-400">Level {quality}</span>
            </div>
            <p className="text-[11px] text-gray-500">
              Move right for more detail, or left for faster previews and explorations.
            </p>
            <input
              type="range"
              min={1}
              max={5}
              value={quality}
              onChange={e => setQuality(Number(e.target.value))}
              className="w-full accent-fuchsia-400"
            />
            <div className="flex justify-between text-[10px] sm:text-xs text-gray-400">
              <span>Faster previews</span>
              <span>Highest fidelity</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !token}
          className="mt-4 md:mt-6 w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-4 md:px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition duration-300 hover:shadow-purple-500/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Generating...' : 'Generate with imagino.AI'}
        </button>
        <p className="mt-2 text-center text-[11px] text-gray-500">
          Each render uses 1 credit. Upgrade plans unlock higher limits and premium models.
        </p>

        {!showCenterOnMobile && doneImages.length > 0 && (
          <div className="mt-3 lg:hidden">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-white text-sm">Recent renders</h3>
              {totalPages > 1 && <div className="text-xs text-gray-400">{doneImages.length} renders</div>}
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
              {doneImages.slice(0, 30).map(job => (
                <img
                  key={job.id}
                  src={job.url!}
                  onClick={() => {
                    setSelectedImageUrl(job.url!);
                    setSelectedJobId(job.id);
                  }}
                  className={`cursor-pointer rounded-md border-2 object-cover w-20 h-20 flex-none transition-all ${
                    selectedImageUrl === job.url ? 'border-purple-500' : 'border-transparent'
                  }`}
                  alt=""
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={`${showCenterOnMobile ? 'flex' : 'hidden'} lg:flex flex-1 p-4 pt-2 flex-col items-center justify-start`}>
        {centerImageUrl ? (
          <div className="max-w-[512px] w-full">
            <ImageCard
              src={centerImageUrl}
              jobId={selectedJobId ?? undefined}
              loading={false}
              onClick={() => {
                setModalOpen(true);
              }}
            />
          </div>
        ) : loading ? (
          <div className="max-w-[512px] w-full">
            <ImageCard loading={true} onClick={() => {}} />
          </div>
        ) : (
          <div className="hidden lg:block px-4 text-center text-sm text-gray-500">
            Draft your creative brief and press &quot;Generate with imagino.AI&quot; to begin.
          </div>
        )}

        {doneImages.length > 0 && showCenterOnMobile && (
          <div className="mt-4 w-full lg:hidden">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-white text-sm">Recent renders</h3>
              {totalPages > 1 && (
                <div className="text-xs text-gray-400">{doneImages.length} renders</div>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
              {doneImages.slice(0, 30).map(job => (
                <img
                  key={job.id}
                  src={job.url!}
                  onClick={() => {
                    setSelectedImageUrl(job.url!);
                    setSelectedJobId(job.id);
                  }}
                  className={`cursor-pointer rounded-md border-2 object-cover w-20 h-20 flex-none transition-all ${
                    selectedImageUrl === job.url ? 'border-purple-500' : 'border-transparent'
                  }`}
                  alt=""
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {doneImages.length > 0 && (
        <div className="hidden lg:block w-full lg:w-64 flex-shrink-0 p-4 bg-black/30 backdrop-blur-md">
          <h3 className="text-white mb-2 text-sm md:text-base">Recent renders</h3>
          <div className="grid grid-cols-3 lg:grid-cols-2 gap-2 overflow-hidden">
            {paginatedImages.map(job => (
              <img
                key={job.id}
                src={job.url!}
                onClick={() => {
                  setSelectedImageUrl(job.url!);
                  setSelectedJobId(job.id);
                }}
                className={`cursor-pointer rounded-md border-2 object-cover w-16 h-16 lg:w-24 lg:h-24 transition-all transform hover:scale-105 ${
                  selectedImageUrl === job.url ? 'border-purple-500' : 'border-transparent'
                } hover:border-purple-400`}
                alt=""
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-xs text-gray-300 transition hover:border-white/20 hover:text-white"
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-xs text-gray-300 transition hover:border-white/20 hover:text-white"
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <ImageCardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        jobId={selectedJobId}
        fallbackUrl={selectedImageUrl ?? undefined}
      />
      <OutOfCreditsDialog
        open={outOfCredits !== null}
        current={outOfCredits?.current}
        needed={outOfCredits?.needed}
        onClose={() => setOutOfCredits(null)}
      />
      <UpgradePlanDialog open={upgradeDialog} onClose={() => setUpgradeDialog(false)} />
      <ResendVerificationDialog
        open={emailModal}
        email={typeof window !== 'undefined' ? localStorage.getItem('userEmail') : ''}
        onClose={() => setEmailModal(false)}
      />
    </div>
  );
}
