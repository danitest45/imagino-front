'use client';

import ImageCard from '../../../components/ImageCard';
import ImageCardModal from '../../../components/ImageCardModal';
import { useEffect, useState } from 'react';
import {
  createReplicateJob,
  getJobStatus,
  getUserHistory,
} from '../../../lib/api';
import type { UiJob } from '../../../types/image-job';
import { useAuth } from '../../../context/AuthContext';
import { useImageHistory } from '../../../hooks/useImageHistory';
import { mapApiToUiJob } from '../../../lib/api';
import { normalizeUrl } from '../../../lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Problem, mapProblemToUI } from '../../../lib/errors';
import { toast } from '../../../lib/toast';
import OutOfCreditsDialog from '../../../components/OutOfCreditsDialog';
import UpgradePlanDialog from '../../../components/UpgradePlanDialog';
import { useRouter } from 'next/navigation';
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





export default function ReplicatePage() {
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
  const ITEMS_PER_PAGE = 10;
  const router = useRouter();


  

  useEffect(() => {
    if (!history) return;
    // convert jobs from the API to the format used by the UI
    const ui = history
      .map(mapApiToUiJob) // take imageUrl or imageUrls[0] and normalize
      .filter(j => !!j.url);

    setImages(ui);
    setCurrentPage(1);

    // keep the most recent selected in the center
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
      const jobId = await createReplicateJob(prompt, selectedAspectRatio, quality);
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

            // Gracefully handle failures when refreshing the user history
            try {
              const updatedHistory = await getUserHistory();
              setHistory(updatedHistory);
            } catch (historyError) {
              console.warn('Failed to update history:', historyError);
              // Continuar sem quebrar o fluxo principal
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
          // Opcional: limpar o interval em caso de erro persistente
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

  // choose the image to display in the center
  const centerImageUrl = selectedImageUrl;
  const doneImages = images.filter(img => img.status === 'done' && img.url);
  const totalPages = Math.max(Math.ceil(doneImages.length / ITEMS_PER_PAGE), 1);
  const paginatedImages = doneImages.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-hidden bg-slate-950 text-white lg:flex-row">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-fuchsia-500/20 via-purple-700/10 to-transparent blur-3xl" />

      {/* Controls */}
      <section className="order-2 flex w-full flex-col gap-6 border-t border-white/5 bg-slate-950/60 px-4 pb-28 pt-6 backdrop-blur lg:order-1 lg:h-screen lg:max-w-[420px] lg:border-t-0 lg:border-r lg:border-white/5 lg:bg-black/30 lg:px-8 lg:py-12">
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-purple-500/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-fuchsia-100">
                imagino.AI studio
              </span>
              <span className="text-[11px] text-gray-400">Credits update live</span>
            </div>
            <p className="mt-4 text-sm text-gray-200">
              Guide lighting, composition, and tone before you render. Prompts are saved in your history automatically.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label htmlFor="prompt" className="text-sm font-medium text-gray-200">
                Creative brief
              </label>
              <span className="text-[11px] text-gray-500">Include subject, mood &amp; camera details</span>
            </div>
            <textarea
              id="prompt"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the scene, subject, style, and lighting you want to see..."
              className="h-40 resize-none rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-white shadow-lg transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 placeholder:text-gray-500 sm:h-48 md:h-72"
            />
            <div className="flex flex-wrap gap-2">
              {promptSuggestions.map(suggestion => (
                <button
                  key={suggestion.title}
                  type="button"
                  onClick={() => setPrompt(suggestion.prompt)}
                  className="group min-w-[160px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-gray-200 transition hover:border-fuchsia-400/40 hover:bg-white/10"
                >
                  <span className="block text-xs font-semibold text-white">{suggestion.title}</span>
                  <span className="mt-1 block text-[11px] text-gray-400 group-hover:text-gray-200">
                    {suggestion.prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Aspect ratio</p>
              <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500">{selectedAspectRatio}</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                  <span className="mt-1 block text-[11px] text-gray-400">{option.helper}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Quality priority</p>
              <span className="text-xs text-gray-400">Level {quality}</span>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              Move right for more detail, or left for faster previews and explorations.
            </p>
            <input
              type="range"
              min={1}
              max={5}
              value={quality}
              onChange={e => setQuality(Number(e.target.value))}
              className="mt-3 w-full accent-fuchsia-400"
            />
            <div className="mt-2 flex justify-between text-[10px] text-gray-400 sm:text-xs">
              <span>Faster previews</span>
              <span>Highest fidelity</span>
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <div className="sticky bottom-0 left-0 right-0 -mx-4 bg-slate-950/95 px-4 pb-6 pt-4 backdrop-blur lg:static lg:mx-0 lg:bg-transparent lg:p-0">
            <button
              onClick={handleGenerate}
              disabled={loading || !token}
              className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition duration-300 hover:shadow-purple-500/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Generating…' : 'Generate with imagino.AI'}
            </button>
            <p className="mt-2 text-center text-[11px] text-gray-500">
              Each render uses 1 credit. Upgrade plans unlock higher limits and premium models.
            </p>
          </div>
        </div>
      </section>

      {/* Viewer */}
      <section className="order-1 flex flex-1 flex-col px-4 pb-24 pt-6 sm:px-6 lg:order-2 lg:px-10 lg:py-12">
        <div className="mx-auto w-full max-w-2xl flex-1">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-gray-500">
            <span>Live render preview</span>
            {selectedImageUrl && <span>#{selectedJobId?.slice(0, 8)}</span>}
          </div>

          <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-4 shadow-2xl shadow-purple-500/20 sm:p-6">
            {centerImageUrl ? (
              <ImageCard
                src={centerImageUrl}
                jobId={selectedJobId ?? undefined}
                loading={false}
                onClick={() => {
                  setModalOpen(true);
                }}
              />
            ) : loading ? (
              <ImageCard loading={true} onClick={() => {}} />
            ) : (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center text-sm text-gray-400 sm:min-h-[360px]">
                <div className="rounded-full border border-dashed border-white/20 px-4 py-1 text-[11px] uppercase tracking-[0.3em]">
                  Waiting for first render
                </div>
                <p className="max-w-sm text-balance text-xs text-gray-400 sm:text-sm">
                  Draft your creative brief, adjust generation settings, and press “Generate with imagino.AI” to see your image appear here in real time.
                </p>
              </div>
            )}
          </div>
        </div>

        {doneImages.length > 0 && (
          <div className="mx-auto mt-10 w-full max-w-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Recent renders</h3>
                <p className="text-[11px] text-gray-500">Tap an image to focus or open details.</p>
              </div>
              <span className="text-[11px] text-gray-500">{doneImages.length} total</span>
            </div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-3">
              {doneImages.slice(0, 30).map(job => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => {
                    setSelectedImageUrl(job.url!);
                    setSelectedJobId(job.id);
                  }}
                  className={`group relative h-24 w-24 flex-none overflow-hidden rounded-2xl border transition-all duration-200 sm:h-28 sm:w-28 ${
                    selectedImageUrl === job.url
                      ? 'border-fuchsia-400 shadow-lg shadow-fuchsia-500/30'
                      : 'border-white/10 hover:border-fuchsia-300/60'
                  }`}
                >
                  <img src={job.url!} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-x-2 bottom-2 hidden rounded-full bg-black/60 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white group-hover:flex">
                    Select
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Desktop history */}
      {doneImages.length > 0 && (
        <aside className="order-3 hidden w-full max-w-[280px] flex-col border-l border-white/5 bg-black/20 px-5 py-10 backdrop-blur lg:flex xl:max-w-sm">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-white">History</h3>
            <span className="text-[11px] text-gray-500">Page {currentPage}</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">Choose a render to preview or download.</p>
          <div className="mt-5 grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
            {paginatedImages.map(job => (
              <button
                key={job.id}
                type="button"
                onClick={() => {
                  setSelectedImageUrl(job.url!);
                  setSelectedJobId(job.id);
                }}
                className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 ${
                  selectedImageUrl === job.url
                    ? 'border-fuchsia-400 shadow-lg shadow-fuchsia-500/20'
                    : 'border-white/10 hover:border-fuchsia-300/60'
                }`}
              >
                <img src={job.url!} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-x-2 bottom-2 hidden rounded-full bg-black/60 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white group-hover:flex">
                  Focus
                </span>
              </button>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </aside>
      )}

      <ImageCardModal isOpen={modalOpen} onClose={() => setModalOpen(false)} jobId={selectedJobId} />
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
    </main>
  );
}
