// hooks/useImageJobs.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { createRunpodJob, getJobStatus } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { JobUpdate, useSignalR } from './useSignalR';

export interface ImageJob {
  id: string;
  status: 'loading' | 'done';
  urls: string[] | null;
  resolution: { width: number; height: number };
}

interface JobResult {
  success: boolean;
  urls: string[] | null;
}

const COMPLETED_STATUSES = new Set(['COMPLETED', 'SUCCEEDED', 'DONE']);
const FAILED_STATUSES = new Set(['FAILED', 'CANCELLED', 'ERROR']);

function normalizeResult(status?: string | null, urls?: string[] | null): JobResult | null {
  const normalizedStatus = status?.toUpperCase() ?? null;

  if (normalizedStatus && COMPLETED_STATUSES.has(normalizedStatus)) {
    if (urls && urls.length > 0) {
      return { success: true, urls };
    }
    return null;
  }
  if (normalizedStatus && FAILED_STATUSES.has(normalizedStatus)) {
    return { success: false, urls: null };
  }
  if (!normalizedStatus && urls && urls.length > 0) {
    return { success: true, urls };
  }
  return null;
}

function reviveStoredJobs(raw: unknown): ImageJob[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const id = typeof (entry as { id?: unknown }).id === 'string' ? (entry as { id: string }).id : null;
      if (!id) {
        return null;
      }

      const statusValue = (entry as { status?: unknown }).status;
      const status: ImageJob['status'] = statusValue === 'done' ? 'done' : 'loading';

      const resolutionValue = (entry as { resolution?: unknown }).resolution;
      const width =
        resolutionValue && typeof (resolutionValue as { width?: unknown }).width === 'number'
          ? (resolutionValue as { width: number }).width
          : 1024;
      const height =
        resolutionValue && typeof (resolutionValue as { height?: unknown }).height === 'number'
          ? (resolutionValue as { height: number }).height
          : 1024;

      const urlsValue = (entry as { urls?: unknown }).urls;
      const urls = Array.isArray(urlsValue)
        ? urlsValue.filter((url): url is string => typeof url === 'string')
        : null;

      return {
        id,
        status,
        urls: urls && urls.length > 0 ? urls : null,
        resolution: { width, height },
      } satisfies ImageJob;
    })
    .filter((job): job is ImageJob => job !== null);
}

export function useImageJobs() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<ImageJob[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('image-jobs');
    if (!saved) return [];
    try {
      return reviveStoredJobs(JSON.parse(saved));
    } catch (error) {
      console.error('Failed to parse stored image jobs', error);
      return [];
    }
  });
  const jobsRef = useRef<ImageJob[]>(jobs);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('image-jobs', JSON.stringify(jobs));
  }, [jobs]);

  const finalizeJob = useCallback((jobId: string, result: JobResult) => {
    let shouldNotifyCredits = false;
    setJobs(prev => {
      let updated = false;
      const next = prev.map((job): ImageJob => {
        if (job.id !== jobId) return job;
        updated = true;
        if (
          job.status === 'loading' &&
          result.success &&
          result.urls &&
          result.urls.length > 0
        ) {
          shouldNotifyCredits = true;
        }
        return {
          ...job,
          status: 'done' as const,
          urls: result.success ? result.urls ?? job.urls ?? null : null,
        } satisfies ImageJob;
      });
      return updated ? next : prev;
    });
    if (shouldNotifyCredits && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('creditsUpdated'));
    }
  }, []);

  const refreshJobs = useCallback(async () => {
    if (!token) return;
    const pending = jobsRef.current.filter(job => job.status === 'loading');
    if (!pending.length) return;

    const statuses = await Promise.all(
      pending.map(async job => {
        const status = await getJobStatus(job.id);
        return { jobId: job.id, status };
      }),
    );

    statuses.forEach(({ jobId, status }) => {
      if (!status) return;
      let urls: string[] | null = null;
      const rawUrls = status.imageUrls;
      if (Array.isArray(rawUrls)) {
        urls = rawUrls;
      } else if (typeof rawUrls === 'string') {
        urls = [rawUrls];
      }
      const result = normalizeResult(status.status ?? null, urls);
      if (result) {
        finalizeJob(jobId, result);
      }
    });
  }, [finalizeJob, token]);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs]);

  const handleJobCompleted = useCallback((job: JobUpdate) => {
    const jobId = job.jobId ?? job.id;
    if (!jobId) return;
    let urls: string[] | null = null;
    if (Array.isArray(job.imageUrls)) {
      urls = job.imageUrls;
    } else if (Array.isArray(job.resultImageUrls)) {
      urls = job.resultImageUrls;
    } else if (typeof job.imageUrl === 'string') {
      urls = [job.imageUrl];
    }
    const result = normalizeResult(job.status ?? null, urls);
    if (result) {
      finalizeJob(jobId, result);
    }
  }, [finalizeJob]);

  const handleReconnect = useCallback(() => {
    void refreshJobs();
  }, [refreshJobs]);

  const handleClose = useCallback(() => {
    void refreshJobs();
  }, [refreshJobs]);

  useSignalR(token, {
    onJobCompleted: handleJobCompleted,
    onReconnected: handleReconnect,
    onClose: handleClose,
  });

  const submitPrompt = useCallback(
    async (prompt: string, resolution: { width: number; height: number }) => {
      const jobId = await createRunpodJob(prompt, resolution);
      const placeholder: ImageJob = { id: jobId, status: 'loading' as const, urls: null, resolution };
      setJobs(prev => [placeholder, ...prev]);
      return jobId;
    },
    [],
  );

  return { jobs, submitPrompt };
}

