'use client';

import ImageCard from '../../../components/ImageCard';
import ImageCardModal from '../../../components/ImageCardModal';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createReplicateJob,
  getJobStatus,
  getUserHistory,
  mapApiToUiJob,
  normalizeUrl,
} from '../../../lib/api';
import type { UiJob } from '../../../types/image-job';
import { useAuth } from '../../../context/AuthContext';
import { useImageHistory } from '../../../hooks/useImageHistory';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const startPollingJob = useCallback(
    (jobId: string, options?: { refreshHistory?: boolean; selectOnComplete?: boolean; stopLoading?: boolean }) => {
      if (pollingIntervals.current.has(jobId)) return;

      const interval = setInterval(async () => {
        try {
          const content = await getJobStatus(jobId);
          if (!content) return;

          const rawStatus = (content.status ?? (content as Record<string, unknown>).Status) as string | undefined;
          const normalizedStatus = rawStatus?.toUpperCase();

          const rawUrl = Array.isArray(content.imageUrls) && content.imageUrls.length > 0
            ? content.imageUrls[0]
            : (content as Record<string, unknown>).imageUrl ?? null;

          if (normalizedStatus === 'COMPLETED') {
            const fullUrl = normalizeUrl(rawUrl);

            setImages(prev => prev.map((j: UiJob) => (j.id === jobId ? { ...j, status: 'done', url: fullUrl } : j)));

            if (options?.selectOnComplete) {
              setSelectedImageUrl(fullUrl);
              setSelectedJobId(jobId);
            }

            if (options?.refreshHistory) {
              try {
                const updatedHistory = await getUserHistory();
                setHistory(updatedHistory);
              } catch (historyError) {
                console.warn('Failed to update history:', historyError);
              }
            }

            window.dispatchEvent(new Event('creditsUpdated'));
            if (options?.stopLoading) {
              setLoading(false);
            }

            clearInterval(interval);
            pollingIntervals.current.delete(jobId);
          }

          if (normalizedStatus === 'FAILED') {
            setImages(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'failed' } : j)));
            if (options?.stopLoading) {
              setLoading(false);
            }

            clearInterval(interval);
            pollingIntervals.current.delete(jobId);
          }
        } catch (pollError) {
          console.error('Polling error:', pollError);
        }
      }, 3000);

      pollingIntervals.current.set(jobId, interval);
    },
    [setHistory],
  );




  useEffect(() => {
    if (!history) return;
    // convert jobs from the API to the format used by the UI
    setImages(prev => {
      const mappedHistory = history.map(mapApiToUiJob);
      const mappedIds = new Set(mappedHistory.map(job => job.id));
      const pending = prev.filter(job => !mappedIds.has(job.id));

      const mergedHistory = mappedHistory.map(job => {
        const existing = prev.find(p => p.id === job.id);
        if (!existing) return job;

        const status = existing.status === 'done' || existing.status === 'failed'
          ? existing.status
          : job.status;
        const url = existing.url ?? job.url;

        return { ...job, status, url };
      });

      return [...pending, ...mergedHistory];
    });
    setCurrentPage(1);
  }, [history]);

  useEffect(() => {
    if (images.length === 0) {
      setSelectedImageUrl(null);
      setSelectedJobId(null);
      return;
    }

    const selectedJob = selectedJobId ? images.find(job => job.id === selectedJobId) : undefined;
    const resolvedJob = selectedJob ?? images[0];

    if (!selectedJob) {
      setSelectedJobId(resolvedJob.id);
    }

    const resolvedUrl = resolvedJob.url ?? null;
    if (selectedImageUrl !== resolvedUrl) {
      setSelectedImageUrl(resolvedUrl);
    }
  }, [images, selectedJobId, selectedImageUrl]);

  useEffect(() => {
    images.forEach(job => {
      if (job.status === 'loading') {
        startPollingJob(job.id);
      } else {
        const existingInterval = pollingIntervals.current.get(job.id);
        if (existingInterval) {
          clearInterval(existingInterval);
          pollingIntervals.current.delete(job.id);
        }
      }
    });
  }, [images, startPollingJob]);

  useEffect(() => () => {
    pollingIntervals.current.forEach(clearInterval);
    pollingIntervals.current.clear();
  }, []);



  async function handleGenerate() {
    if (!prompt.trim()) return;
    if (!token) {
      console.warn('User not authenticated');
      return;
    }

    setLoading(true);
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
      setSelectedJobId(jobId);
      setSelectedImageUrl(null);

      startPollingJob(jobId, { refreshHistory: true, selectOnComplete: true, stopLoading: true });
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

  const selectedJob = selectedJobId ? images.find(job => job.id === selectedJobId) : undefined;
  const centerJob = selectedJob ?? images[0];
  const centerImageUrl = centerJob?.url ?? null;
  const centerJobStatus = centerJob?.status ?? (loading ? 'loading' : 'done');

  const historyJobs = images;
  const totalPages = Math.max(Math.ceil(historyJobs.length / ITEMS_PER_PAGE), 1);
  const paginatedImages = historyJobs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const showCenterOnMobile = !!centerJob || loading;

  const handleSelectJob = (job: UiJob) => {
    setSelectedJobId(job.id);
    setSelectedImageUrl(job.url ?? null);
  };

  const renderHistoryItem = (job: UiJob, className: string) => {
    const isSelected = selectedJobId === job.id;
    const baseClasses = `${className} cursor-pointer rounded-md border-2 transition-all ${
      isSelected ? 'border-purple-500' : 'border-transparent'
    }`;

    if (job.status === 'done' && job.url) {
      return (
        <img
          key={job.id}
          src={job.url}
          onClick={() => handleSelectJob(job)}
          className={`${baseClasses} object-cover`}
          alt=""
        />
      );
    }

    if (job.status === 'failed') {
      return (
        <div
          key={job.id}
          onClick={() => handleSelectJob(job)}
          className={`${baseClasses} flex items-center justify-center bg-red-500/10 text-[11px] text-red-200`}
        >
          Failed
        </div>
      );
    }

    return (
      <div
        key={job.id}
        onClick={() => handleSelectJob(job)}
        className={`${baseClasses} flex items-center justify-center bg-white/5`}
      >
        <Loader2 className="h-4 w-4 animate-spin text-fuchsia-200" />
      </div>
    );
  };

  return (
    <div className="flex h-full flex-1 flex-col lg:flex-row lg:items-start animate-fade-in">
      {/* Left panel: prompt and controls */}
      <div className="w-full lg:w-[480px] flex-shrink-0 p-3 sm:p-4 md:p-6 flex flex-col h-auto lg:h-full bg-black/40 backdrop-blur-lg animate-fade-in">
        <div className="flex flex-col gap-5 md:gap-6 lg:flex-1">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-purple-500/10">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-fuchsia-100">
                imagino.AI studio
              </span>
              <span className="text-[11px] text-gray-400">Credits update live</span>
            </div>
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

        {/* Mobile history directly under controls when center is hidden */}
        {!showCenterOnMobile && historyJobs.length > 0 && (
          <div className="mt-3 lg:hidden">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-white text-sm">Recent renders</h3>
              {totalPages > 1 && <div className="text-xs text-gray-400">{historyJobs.length} renders</div>}
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
              {historyJobs.slice(0, 30).map(job => renderHistoryItem(job, 'w-20 h-20'))}
            </div>
          </div>
        )}
      </div>

      {/* Center panel: selected image or generation state */}
      <div className={`${showCenterOnMobile ? 'flex' : 'hidden'} lg:flex flex-1 p-4 pt-2 flex-col items-center justify-start`}>
        {centerJob ? (
          <div className="max-w-[512px] w-full">
            <ImageCard
              src={centerImageUrl ?? undefined}
              jobId={centerJob.id ?? undefined}
              status={centerJobStatus}
              onClick={() => {
                setModalOpen(true);
              }}
            />
          </div>
        ) : loading ? (
          <div className="max-w-[512px] w-full">
            <ImageCard status="loading" onClick={() => {}} />
          </div>
        ) : (
          <div className="hidden lg:block px-4 text-center text-sm text-gray-500">
            Draft your creative brief and press &quot;Generate with imagino.AI&quot; to begin.
          </div>
        )}

        {/* Mobile history carousel (when center is shown) */}
        {historyJobs.length > 0 && showCenterOnMobile && (
          <div className="mt-4 w-full lg:hidden">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-white text-sm">Recent renders</h3>
              {totalPages > 1 && (
                <div className="text-xs text-gray-400">{historyJobs.length} renders</div>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
              {historyJobs.slice(0, 30).map(job => renderHistoryItem(job, 'w-20 h-20'))}
            </div>
          </div>
        )}
      </div>

      {/* Removed separate mobile history block to avoid layout gap; it's now inside the left panel */}

      {/* Right panel: history */}
      {historyJobs.length > 0 && (
        <div className="hidden lg:block w-full lg:w-64 flex-shrink-0 p-4 bg-black/30 backdrop-blur-md">
          <h3 className="text-white mb-2 text-sm md:text-base">Recent renders</h3>
          <div className="grid grid-cols-3 lg:grid-cols-2 gap-2 overflow-hidden">
            {paginatedImages.map(job => renderHistoryItem(job, 'object-cover w-16 h-16 lg:w-24 lg:h-24 transform hover:scale-105 hover:border-purple-400'))}
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

  {/* Modal to enlarge image */}
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
