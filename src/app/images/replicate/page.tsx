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
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
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

  const renderPromptComposer = (variant: 'mobile' | 'desktop') => (
    <section
      className={`rounded-3xl border border-white/10 bg-black/40 shadow-lg shadow-purple-500/10 backdrop-blur ${
        variant === 'desktop' ? 'p-5 space-y-5' : 'p-4 space-y-4'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-fuchsia-200">
            Creative brief
          </p>
          <p className={`text-sm text-gray-300 ${variant === 'desktop' ? 'max-w-xs' : 'max-w-full'}`}>
            Add subject, mood, lighting, and brand cues for a production-ready render.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-400">
          Live credits
        </span>
      </div>
      <div className="space-y-3">
        <label htmlFor={`prompt-${variant}`} className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
          Prompt
        </label>
        <textarea
          id={`prompt-${variant}`}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the scene, subject, style, and lighting you want to see..."
          className={`min-h-[160px] w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-white shadow-inner shadow-purple-500/10 transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 placeholder:text-gray-500 ${
            variant === 'desktop' ? 'md:min-h-[260px]' : ''
          }`}
        />
        <div className="flex flex-wrap gap-2">
          {promptSuggestions.map(suggestion => (
            <button
              key={suggestion.title}
              type="button"
              onClick={() => setPrompt(suggestion.prompt)}
              className="group min-w-[160px] flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-gray-200 transition hover:border-fuchsia-400/40 hover:bg-white/10"
            >
              <span className="block text-xs font-semibold text-white">{suggestion.title}</span>
              <span className="mt-1 block text-[11px] text-gray-400 group-hover:text-gray-200">
                {suggestion.prompt}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );

  const renderAspectRatioSelector = (variant: 'mobile' | 'desktop') => (
    <section
      className={`rounded-3xl border border-white/10 bg-black/35 shadow-lg shadow-purple-500/10 backdrop-blur ${
        variant === 'desktop' ? 'p-5 space-y-4' : 'p-4 space-y-3'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Aspect ratio</p>
        <span className="text-[11px] uppercase tracking-[0.3em] text-gray-500">{selectedAspectRatio}</span>
      </div>
      <div className={`${variant === 'desktop' ? 'grid grid-cols-3 gap-3' : 'grid grid-cols-1 gap-2 sm:grid-cols-3'}`}>
        {aspectRatioOptions.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSelectedAspectRatio(option.value)}
            className={`rounded-2xl border px-4 py-3 text-left text-xs transition ${
              selectedAspectRatio === option.value
                ? 'border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/30 via-purple-500/20 to-cyan-400/20 text-white shadow-inner shadow-purple-500/20'
                : 'border-white/10 bg-black/30 text-gray-300 hover:border-white/20 hover:text-white'
            }`}
          >
            <span className="block text-sm font-semibold">{option.label}</span>
            <span className="mt-1 block text-[11px] text-gray-400">{option.helper}</span>
          </button>
        ))}
      </div>
    </section>
  );

  const renderQualitySelector = (variant: 'mobile' | 'desktop') => (
    <section
      className={`rounded-3xl border border-white/10 bg-black/35 shadow-lg shadow-purple-500/10 backdrop-blur ${
        variant === 'desktop' ? 'p-5 space-y-4' : 'p-4 space-y-3'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Quality priority</p>
          <p className="text-[11px] text-gray-500">Move right for more detail; left for faster previews.</p>
        </div>
        <span className="text-xs text-gray-400">Level {quality}</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={quality}
        onChange={e => setQuality(Number(e.target.value))}
        className="w-full accent-fuchsia-400"
        aria-label="Quality priority"
      />
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>Faster previews</span>
        <span>Highest fidelity</span>
      </div>
    </section>
  );

  const renderGenerateButton = (variant: 'mobile' | 'desktop') => (
    <div className={`${variant === 'mobile' ? 'space-y-2' : 'space-y-3'}`}>
      <button
        onClick={handleGenerate}
        disabled={loading || !token}
        className="w-full rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-purple-500/30 transition duration-300 hover:shadow-purple-500/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Generating…' : 'Generate with imagino.AI'}
      </button>
      <p className="text-center text-[11px] text-gray-500">
        Each render uses 1 credit. Upgrade plans unlock higher limits and premium models.
      </p>
    </div>
  );

  const renderPreviewPanel = (variant: 'mobile' | 'desktop') => (
    <section
      className={`rounded-3xl border border-white/10 bg-black/35 shadow-lg shadow-purple-500/10 backdrop-blur ${
        variant === 'desktop' ? 'flex flex-1 flex-col p-6' : 'p-4 space-y-4'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-fuchsia-200">Preview</p>
          <p className="text-sm text-gray-300">Tap the image to view details and download options.</p>
        </div>
        {loading && <span className="text-[11px] text-fuchsia-200 animate-pulse">Generating…</span>}
      </div>
      <div className={`mt-4 w-full ${variant === 'desktop' ? 'flex-1' : ''}`}>
        {centerImageUrl ? (
          <div className={`${variant === 'desktop' ? 'mx-auto max-w-[512px]' : 'max-w-full'} w-full`}>
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
          <div className={`${variant === 'desktop' ? 'mx-auto max-w-[512px]' : 'max-w-full'} w-full`}>
            <ImageCard loading={true} onClick={() => {}} />
          </div>
        ) : (
          <div
            className={`flex items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 text-center text-sm text-gray-400 ${
              variant === 'desktop' ? 'h-full min-h-[320px]' : 'min-h-[180px] py-10'
            }`}
          >
            Draft your creative brief and press “Generate” to see your image here.
          </div>
        )}
      </div>
    </section>
  );

  const renderMobileHistory = () => {
    if (doneImages.length === 0) return null;

    return (
      <section className="rounded-3xl border border-white/10 bg-black/35 p-4 shadow-lg shadow-purple-500/10 backdrop-blur">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Recent renders</h3>
          <span className="text-[11px] text-gray-500">{doneImages.length} saved</span>
        </div>
        <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto pb-2 pl-1 pr-1 no-scrollbar">
          {doneImages.slice(0, 24).map(job => (
            <button
              key={job.id}
              type="button"
              onClick={() => {
                setSelectedImageUrl(job.url!);
                setSelectedJobId(job.id);
              }}
              className={`relative flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-xl border-2 transition-all ${
                selectedImageUrl === job.url ? 'border-fuchsia-400 shadow-md shadow-fuchsia-500/30' : 'border-transparent'
              }`}
            >
              <img src={job.url!} alt="Generated thumbnail" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </section>
    );
  };

  const renderDesktopHistory = () => {
    if (doneImages.length === 0) return null;

    return (
      <aside className="flex w-72 flex-shrink-0 flex-col gap-4 rounded-3xl border border-white/10 bg-black/30 p-5 shadow-inner shadow-purple-500/5 backdrop-blur">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Recent renders</h3>
          <span className="text-xs text-gray-500">{doneImages.length}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {paginatedImages.map(job => (
            <button
              key={job.id}
              type="button"
              onClick={() => {
                setSelectedImageUrl(job.url!);
                setSelectedJobId(job.id);
              }}
              className={`relative overflow-hidden rounded-xl border-2 transition-all hover:-translate-y-0.5 hover:border-fuchsia-400/70 ${
                selectedImageUrl === job.url ? 'border-fuchsia-500 shadow-lg shadow-fuchsia-500/30' : 'border-transparent'
              }`}
            >
              <img src={job.url!} alt="Generated thumbnail" className="h-20 w-full object-cover" />
            </button>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 text-white">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-full border border-white/10 p-2 text-white transition disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-full border border-white/10 p-2 text-white transition disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </aside>
    );
  };

  return (
    <div className="flex h-full flex-1 flex-col gap-0 lg:flex-row lg:items-stretch animate-fade-in">
      {/* Mobile layout */}
      <div className="flex flex-col gap-6 px-4 pb-24 pt-6 lg:hidden">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-fuchsia-200">
            <Sparkles className="h-4 w-4" />
            <span>imagino.AI studio</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Craft production-ready visuals on the go.</h1>
          <p className="text-sm text-gray-400">
            Compose prompts, fine-tune settings, and review your render history without leaving your phone.
          </p>
        </header>

        {renderPromptComposer('mobile')}
        <div className="space-y-4">
          {renderAspectRatioSelector('mobile')}
          {renderQualitySelector('mobile')}
        </div>
        {renderGenerateButton('mobile')}
        {renderPreviewPanel('mobile')}
        {renderMobileHistory()}
      </div>

      {/* Desktop layout */}
      <div className="hidden h-full flex-1 gap-6 px-6 pb-16 pt-4 lg:flex">
        <div className="flex w-[440px] flex-shrink-0 flex-col gap-6">
          {renderPromptComposer('desktop')}
          {renderAspectRatioSelector('desktop')}
          {renderQualitySelector('desktop')}
          {renderGenerateButton('desktop')}
        </div>
        <div className="flex min-h-[calc(100vh-180px)] flex-1 flex-col gap-6">
          {renderPreviewPanel('desktop')}
        </div>
        {renderDesktopHistory()}
      </div>

      {/* Global modals */}
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
    </div>
  );
}
