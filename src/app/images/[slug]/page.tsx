'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageCard from '../../../components/ImageCard';
import ImageCardModal from '../../../components/ImageCardModal';
import OutOfCreditsDialog from '../../../components/OutOfCreditsDialog';
import UpgradePlanDialog from '../../../components/UpgradePlanDialog';
import ResendVerificationDialog from '../../../components/ResendVerificationDialog';
import { useAuth } from '../../../context/AuthContext';
import { useImageHistory } from '../../../hooks/useImageHistory';
import {
  createImageJob,
  getImageModelDetails,
  getJobStatus,
  getUserHistory,
  mapApiToUiJob,
  normalizeUrl,
} from '../../../lib/api';
import { Problem, mapProblemToUI } from '../../../lib/errors';
import { toast } from '../../../lib/toast';
import type {
  PublicImageModelDetails,
  PublicImageModelPresetSummary,
} from '../../../types/image';
import type { UiJob } from '../../../types/image-job';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

interface ImageModelPageProps {
  params: { slug: string };
}

export default function ImageModelPage({ params }: ImageModelPageProps) {
  const { slug } = params;
  const router = useRouter();
  const { token } = useAuth();
  const { history, setHistory } = useImageHistory();
  const [model, setModel] = useState<PublicImageModelDetails | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] =
    useState<PublicImageModelPresetSummary | null>(null);
  const [images, setImages] = useState<UiJob[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [outOfCredits, setOutOfCredits] =
    useState<{ current?: number; needed?: number } | null>(null);
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setModelLoading(true);
    async function loadDetails() {
      try {
        const details = await getImageModelDetails(slug, ['versions', 'presets']);
        if (!cancelled) {
          setModel(details);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setModel(null);
        }
      } finally {
        if (!cancelled) {
          setModelLoading(false);
        }
      }
    }
    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    setSelectedPreset(null);
    setPrompt('');
  }, [slug]);

  useEffect(() => {
    if (!history) return;
    const ui = history
      .map(mapApiToUiJob)
      .filter(job => !!job.url);
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

  const doneImages = useMemo(
    () => images.filter(img => img.status === 'done' && img.url),
    [images],
  );

  const totalPages = Math.max(Math.ceil(doneImages.length / ITEMS_PER_PAGE), 1);
  const paginatedImages = useMemo(
    () =>
      doneImages.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
      ),
    [doneImages, currentPage],
  );

  const showCenterOnMobile = !!selectedImageUrl || jobLoading;
  const centerImageUrl = selectedImageUrl;

  async function handleGenerate() {
    if (!prompt.trim()) return;
    if (!token) {
      console.warn('User not authenticated');
      return;
    }
    if (!model && !selectedPreset) {
      console.warn('Model not loaded');
      return;
    }

    setJobLoading(true);
    setSelectedImageUrl(null);
    setSelectedJobId(null);

    try {
      const versionTag = model?.defaultVersionTag || model?.versions?.[0]?.versionTag;
      const payload = selectedPreset
        ? { presetId: selectedPreset.id, prompt }
        : {
            model: slug,
            ...(versionTag ? { version: versionTag } : {}),
            prompt,
          };
      const jobId = await createImageJob(payload);
      const newJob: UiJob = {
        id: jobId,
        status: 'loading',
        url: null,
        aspectRatio: '1:1',
      };
      setImages(prev => [newJob, ...prev]);
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
            setImages(prev =>
              prev.map(job => (job.id === jobId ? { ...job, status: 'done', url: fullUrl } : job)),
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
            setJobLoading(false);
          }

          if (status === 'FAILED') {
            clearInterval(poll);
            setImages(prev => prev.map(job => (job.id === jobId ? { ...job, status: 'done' } : job)));
            setJobLoading(false);
          }
        } catch (pollError) {
          console.error('Polling error:', pollError);
          clearInterval(poll);
          setJobLoading(false);
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
      setJobLoading(false);
    }
  }

  if (modelLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
        Loading model...
      </div>
    );
  }

  if (!model) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
        Model not found.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col lg:flex-row lg:items-start animate-fade-in">
      {/* Left panel */}
      <div className="w-full lg:w-[480px] flex-shrink-0 p-3 sm:p-4 md:p-6 flex flex-col h-auto lg:h-full bg-black/40 backdrop-blur-lg animate-fade-in">
        <div className="flex flex-col gap-5 md:gap-6 lg:flex-1">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-purple-500/10">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-fuchsia-100">
                imagino.AI models
              </span>
              {model.visibility !== 'Public' && (
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/80">
                  {model.visibility}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-white">{model.displayName}</h1>
            <p className="mt-2 text-sm text-gray-300">
              Compose your prompt and generate using {model.displayName}. You can start from a preset or craft a custom brief.
            </p>
            {model.versions && model.versions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.25em] text-gray-400">
                {model.versions.map(version => (
                  <span
                    key={`${model.slug}-${version.versionTag}`}
                    className={`rounded-full border px-3 py-1 ${
                      version.status === 'Active'
                        ? 'border-emerald-400/40 text-emerald-200'
                        : version.status === 'Canary'
                          ? 'border-amber-400/40 text-amber-200'
                          : 'border-gray-500/40 text-gray-400'
                    }`}
                  >
                    {version.versionTag} · {version.status}
                  </span>
                ))}
              </div>
            )}
          </div>

          {model.presets && model.presets.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Model presets</h2>
                {selectedPreset && (
                  <button
                    type="button"
                    onClick={() => setSelectedPreset(null)}
                    className="text-[11px] font-semibold uppercase tracking-[0.25em] text-fuchsia-200 hover:text-fuchsia-100"
                  >
                    Clear preset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {model.presets.map(preset => {
                  const isSelected = selectedPreset?.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={`flex h-full flex-col justify-between rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/25 via-purple-500/20 to-cyan-400/20 text-white'
                          : 'border-white/10 bg-black/30 text-gray-200 hover:border-fuchsia-400/40 hover:bg-black/40'
                      }`}
                    >
                      <div className="space-y-2">
                        <h3 className="text-base font-semibold text-white">{preset.name}</h3>
                        {preset.description && (
                          <p className="text-sm text-gray-300">{preset.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPreset(preset)}
                        className={`mt-4 inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                          isSelected
                            ? 'border-white/20 bg-white/20 text-white'
                            : 'border-white/20 bg-black/40 text-gray-200 hover:border-fuchsia-300 hover:text-white'
                        }`}
                      >
                        {isSelected ? 'Preset selecionado' : 'Usar preset'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label htmlFor="prompt" className="text-sm font-medium text-gray-200">
                Creative brief
              </label>
              {selectedPreset ? (
                <span className="text-[11px] text-fuchsia-200">Using preset: {selectedPreset.name}</span>
              ) : (
                <span className="text-[11px] text-gray-500">Describe subject, mood &amp; style</span>
              )}
            </div>
            <textarea
              id="prompt"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe what you want to generate..."
              className="h-40 sm:h-48 md:h-64 resize-none rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-white shadow-lg transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 placeholder:text-gray-500"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={jobLoading || !token}
          className="mt-4 md:mt-6 w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-4 md:px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition duration-300 hover:shadow-purple-500/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {jobLoading ? 'Generating...' : `Generate with ${model.displayName}`}
        </button>
        <p className="mt-2 text-center text-[11px] text-gray-500">
          Each render uses 1 credit. Premium models may require upgraded plans.
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

      {/* Center panel */}
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
        ) : jobLoading ? (
          <div className="max-w-[512px] w-full">
            <ImageCard loading onClick={() => {}} />
          </div>
        ) : (
          <div className="hidden lg:block px-4 text-center text-sm text-gray-500">
            Draft your creative brief and press “Generate” to render with {model.displayName}.
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
            <div className="flex justify-center gap-4 mt-2 text-white">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="disabled:opacity-50 p-1"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="disabled:opacity-50 p-1"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <ImageCardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        jobId={selectedJobId}
      />
      <OutOfCreditsDialog
        open={outOfCredits !== null}
        current={outOfCredits?.current}
        needed={outOfCredits?.needed}
        onClose={() => setOutOfCredits(null)}
      />
      <UpgradePlanDialog
        open={upgradeDialog}
        onClose={() => setUpgradeDialog(false)}
      />
      <ResendVerificationDialog
        open={emailModal}
        email={typeof window !== 'undefined' ? localStorage.getItem('userEmail') : ''}
        onClose={() => setEmailModal(false)}
      />
    </div>
  );
}
