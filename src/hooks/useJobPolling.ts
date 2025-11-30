import { useEffect, useRef } from 'react';
import { getJobStatus, normalizeUrl } from '../lib/api';
import type { UiJob } from '../types/image-job';

type JobResolutionStatus = 'done' | 'failed';

type JobResolutionPayload = {
  imageUrl: string | null;
  imageUrls?: string[];
};

type UseJobPollingOptions = {
  jobs: UiJob[];
  onJobUpdate: (jobId: string, updater: (job: UiJob) => UiJob) => void;
  onJobResolved?: (
    jobId: string,
    status: JobResolutionStatus,
    payload: JobResolutionPayload,
  ) => void;
};

export function useJobPolling({ jobs, onJobUpdate, onJobResolved }: UseJobPollingOptions) {
  const intervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => {
    const trackedIntervals = intervals.current;
    const stopPolling = (jobId: string) => {
      const existing = intervals.current.get(jobId);
      if (existing) {
        clearInterval(existing);
        intervals.current.delete(jobId);
      }
    };

    jobs.forEach(job => {
      if (job.status === 'loading' && !intervals.current.has(job.id)) {
        const interval = setInterval(async () => {
          const content = await getJobStatus(job.id);
          if (!content) return;

          const normalizedStatus = content.status?.toUpperCase?.();
          const rawUrl =
            (Array.isArray(content.imageUrls) ? content.imageUrls[0] : null) ??
            (content.imageUrl ?? null);

          if (normalizedStatus === 'COMPLETED') {
            stopPolling(job.id);
            onJobUpdate(job.id, prev => ({ ...prev, status: 'done', url: normalizeUrl(rawUrl) }));
            onJobResolved?.(job.id, 'done', { imageUrl: rawUrl, imageUrls: content.imageUrls });
            return;
          }

          if (normalizedStatus === 'FAILED') {
            stopPolling(job.id);
            onJobUpdate(job.id, prev => ({ ...prev, status: 'failed', url: null }));
            onJobResolved?.(job.id, 'failed', { imageUrl: rawUrl, imageUrls: content.imageUrls });
          }
        }, 3000);

        intervals.current.set(job.id, interval);
      }

      if (job.status !== 'loading' && intervals.current.has(job.id)) {
        stopPolling(job.id);
      }
    });

    return () => {
      trackedIntervals.forEach(clearInterval);
      trackedIntervals.clear();
    };
  }, [jobs, onJobResolved, onJobUpdate]);
}
