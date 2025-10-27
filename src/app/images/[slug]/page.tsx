"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageCard from '../../../components/ImageCard';
import ImageCardModal from '../../../components/ImageCardModal';
import OutOfCreditsDialog from '../../../components/OutOfCreditsDialog';
import UpgradePlanDialog from '../../../components/UpgradePlanDialog';
import ResendVerificationDialog from '../../../components/ResendVerificationDialog';
import { useAuth } from '../../../context/AuthContext';
import { useImageHistory } from '../../../hooks/useImageHistory';
import type { UiJob } from '../../../types/image-job';
import type {
  PublicImageModelDetails,
  PublicImageModelPresetSummary,
} from '../../../types/image';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

type ImageModelPageProps = {
  params: { slug: string };
};

export default function ImageModelPage({ params }: ImageModelPageProps) {
  const { slug } = params;
  const [model, setModel] = useState<PublicImageModelDetails | null>(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] =
    useState<PublicImageModelPresetSummary | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>();
  const [images, setImages] = useState<UiJob[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [outOfCredits, setOutOfCredits] =
    useState<{ current?: number; needed?: number } | null>(null);
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { token } = useAuth();
  const { history, setHistory } = useImageHistory();
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    setSelectedPreset(null);
    setPrompt('');
    setSelectedVersion(undefined);
  }, [slug]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserEmail(localStorage.getItem('userEmail'));
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoadingModel(true);
    getImageModelDetails(slug, ['versions', 'presets'])
      .then(data => {
        if (ignore) return;
        setModel(data);
        setSelectedVersion(data.defaultVersionTag ?? data.versions?.[0]?.versionTag);
      })
      .catch(err => {
        console.error('Failed to load image model details', err);
        if (!ignore) {
          setModel(null);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoadingModel(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [slug]);

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

  const sortedPresets = useMemo(() => {
    return (model?.presets ?? []).slice().sort((a, b) => a.ordering - b.ordering);
  }, [model?.presets]);

  const availableVersions = useMemo(() => {
    return model?.versions ?? [];
  }, [model?.versions]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    if (!token) {
      console.warn('User not authenticated');
      return;
    }
    if (!model) return;

    setLoading(true);
    setSelectedImageUrl(null);
    setSelectedJobId(null);
    try {
      const params: Record<string, unknown> & { prompt: string } = { prompt: prompt.trim() };
      if (selectedPreset) {
        params.presetId = selectedPreset.id;
      } else {
        params.model = slug;
        const versionToUse = selectedVersion ?? model.defaultVersionTag;
        if (versionToUse) {
          params.version = versionToUse;
        }
      }

      const jobId = await createImageJob(params);
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
              prev.map(j => (j.id === jobId ? { ...j, status: 'done', url: fullUrl } : j)),
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
  const paginatedImages = doneImages.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const showCenterOnMobile = !!centerImageUrl || loading;

  return (
    <div className="flex h-full flex-1 flex-col lg:flex-row lg:items-start animate-fade-in">
      <div className="w-full lg:w-[480px] flex-shrink-0 p-3 sm:p-4 md:p-6 flex flex-col h-auto lg:h-full bg-black/40 backdrop-blur-lg animate-fade-in">
        <div className="flex flex-col gap-5 md:gap-6 lg:flex-1">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-gray-300">
            {loadingModel ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 w-2/3 rounded-full bg-white/10" />
                <div className="h-3 w-1/2 rounded-full bg-white/10" />
                <div className="h-3 w-full rounded-full bg-white/10" />
              </div>
            ) : model ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-fuchsia-200">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px]">
                    {model.visibility}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-white/70">
                    {model.status}
                  </span>
                </div>
                <h1 className="text-2xl font-semibold text-white">{model.displayName}</h1>
                <p className="text-xs text-gray-400">
                  Create cinematic visuals with {model.displayName}. Configure a preset below or craft your own prompt.
                </p>
              </div>
            ) : (
              <p className="text-sm text-red-300">Unable to load this model right now.</p>
            )}
          </div>

          {sortedPresets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white uppercase tracking-[0.2em]">Presets</h2>
                {selectedPreset && (
                  <button
                    type="button"
                    className="text-xs text-fuchsia-200 hover:text-fuchsia-100"
                    onClick={() => setSelectedPreset(null)}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {sortedPresets.map(preset => {
                  const isSelected = selectedPreset?.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={`rounded-2xl border p-4 transition ${
                        isSelected
                          ? 'border-fuchsia-400/60 bg-gradient-to-br from-fuchsia-500/20 via-purple-500/10 to-cyan-400/10'
                          : 'border-white/10 bg-black/40 hover:border-fuchsia-400/30'
                      }`}
                    >
                      {preset.thumbnail && (
                        <img
                          src={preset.thumbnail}
                          alt={preset.name}
                          className="mb-3 h-32 w-full rounded-xl object-cover"
                        />
                      )}
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200">Preset</p>
                        <h3 className="text-base font-semibold text-white">{preset.name}</h3>
                        {preset.description && (
                          <p className="text-xs text-gray-400 leading-relaxed">{preset.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPreset(isSelected ? null : preset)}
                        className={`mt-4 w-full rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                          isSelected
                            ? 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30'
                            : 'border border-white/20 text-white hover:border-fuchsia-400/40'
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

          {availableVersions.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Versão do modelo</p>
                {selectedVersion && (
                  <span className="text-xs text-gray-400">{selectedVersion}</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500">
                Escolha uma versão específica quando não estiver usando um preset. Presets ignoram esta seleção.
              </p>
              <select
                value={selectedVersion ?? ''}
                onChange={e => setSelectedVersion(e.target.value || undefined)}
                disabled={!!selectedPreset}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-fuchsia-400/50 focus:outline-none"
              >
                {(model?.defaultVersionTag ? [model.defaultVersionTag] : [])
                  .concat(
                    availableVersions
                      .map(v => v.versionTag)
                      .filter((tag, index, arr) => arr.indexOf(tag) === index),
                  )
                  .filter((tag, index, arr) => arr.indexOf(tag) === index)
                  .map(tag => (
                    <option key={tag} value={tag} className="bg-slate-900 text-white">
                      {tag}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5">
            <label htmlFor="prompt" className="text-sm font-semibold text-white">
              Creative prompt
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={6}
              placeholder="Describe the image you want to create..."
              className="min-h-[140px] w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-fuchsia-400/50 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !token || !model}
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
                  alt="Generated image"
                  onClick={() => {
                    setSelectedImageUrl(job.url!);
                    setSelectedJobId(job.id);
                  }}
                  className={`cursor-pointer rounded-md border-2 object-cover w-20 h-20 flex-none transition-all ${
                    selectedImageUrl === job.url ? 'border-purple-500' : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <div className="relative rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-6 md:p-8">
            <div className="absolute inset-0 rounded-[32px] border border-white/10 opacity-70" aria-hidden />
            <div className="relative">
              <ImageCard
                src={centerImageUrl ?? undefined}
                loading={loading || !centerImageUrl}
                jobId={selectedJobId ?? undefined}
                onClick={() => centerImageUrl && setModalOpen(true)}
              />
              {!centerImageUrl && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-sm text-gray-400">
                  <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-fuchsia-200">
                    Ready when you are
                  </span>
                  <p className="max-w-xs text-sm text-gray-300">
                    Draft your creative brief and press &quot;Generate with imagino.AI&quot; to begin.
                  </p>
                </div>
              )}
            </div>
          </div>

          {doneImages.length > 0 && (
            <div className="rounded-[28px] border border-white/10 bg-black/40 p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">History</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-fuchsia-400/40 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-fuchsia-400/40 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {paginatedImages.map(job => (
                  <button
                    key={job.id}
                    onClick={() => {
                      setSelectedImageUrl(job.url!);
                      setSelectedJobId(job.id);
                    }}
                    className={`group relative overflow-hidden rounded-2xl border ${
                      selectedImageUrl === job.url
                        ? 'border-fuchsia-400/60'
                        : 'border-white/10 hover:border-fuchsia-400/30'
                    }`}
                  >
                    <img src={job.url!} alt="Generated image" className="h-36 w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ImageCardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        jobId={selectedJobId}
        fallbackUrl={selectedImageUrl ?? undefined}
      />

      <OutOfCreditsDialog
        open={!!outOfCredits}
        onClose={() => setOutOfCredits(null)}
        current={outOfCredits?.current}
        needed={outOfCredits?.needed}
      />
      <UpgradePlanDialog open={upgradeDialog} onClose={() => setUpgradeDialog(false)} />
      <ResendVerificationDialog
        open={emailModal}
        email={userEmail}
        onClose={() => setEmailModal(false)}
      />
    </div>
  );
}
