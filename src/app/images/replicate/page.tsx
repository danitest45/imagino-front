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
      const jobId = await createReplicateJob(prompt, selectedAspectRatio);
      const newJob: UiJob = {
        id: jobId,
        status: 'loading',
        url: null,
        aspectRatio: selectedAspectRatio,
      };

      setImages((prev: UiJob[]) => [newJob, ...prev]);
      setCurrentPage(1);

      const poll = setInterval(async () => {
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

          const updatedHistory = await getUserHistory();
          setHistory(updatedHistory);
          window.dispatchEvent(new Event('creditsUpdated'));

          setLoading(false);
        }

        if (status === 'FAILED') {
          clearInterval(poll);
          setImages(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'done' } : j)));
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
    <div className="flex h-full flex-1 flex-col lg:flex-row lg:items-start animate-fade-in">
      {/* Left panel: prompt and controls */}
      <div className="w-full lg:w-[480px] flex-shrink-0 p-4 md:p-6 flex flex-col h-full bg-black/40 backdrop-blur-lg animate-fade-in">
        <div className="flex flex-col flex-1 gap-4 md:gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-200">Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the image..."
              className="h-48 md:h-72 p-4 rounded-xl bg-gray-800/60 text-white text-base resize-none placeholder-gray-500 border border-gray-700 shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors hover:bg-gray-700"
            />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {['1:1', '9:16', '16:9'].map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setSelectedAspectRatio(ratio)}
                  className={`px-3 md:px-4 py-2 rounded-lg text-sm transition-all transform hover:scale-105 ${
                    selectedAspectRatio === ratio
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300'
                  } hover:bg-purple-500`}
                >
                  {ratio}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-300">
                Speed vs Quality ({quality})
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={quality}
                onChange={e => setQuality(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Fast</span>
                <span>Quality</span>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !token}
          className="mt-4 md:mt-6 w-full px-4 md:px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-medium rounded-xl transition-all duration-300 transform hover:from-purple-500 hover:to-purple-400 hover:scale-105 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {/* Center panel: selected image or generation state */}
      <div className="flex-1 p-4 flex items-center justify-center">
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
          <div className="text-gray-500 italic text-center px-4">
            Type a prompt and click &quot;Generate&quot; to start.
          </div>
        )}
      </div>

      {/* Right panel: history */}
      {doneImages.length > 0 && (
        <div className="w-full lg:w-64 flex-shrink-0 p-4 bg-black/30 backdrop-blur-md">
          <h3 className="text-white mb-2 text-sm md:text-base">History</h3>
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
