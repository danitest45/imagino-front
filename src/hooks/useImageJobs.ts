// hooks/useImageJobs.ts
import { useState, useEffect } from 'react';
import { createRunpodJob, getJobStatus } from '../lib/api';
import { useAuth } from '../context/AuthContext';


export interface ImageJob {
  id: string;
  status: 'loading' | 'done';
  urls: string[] | null;
  resolution: { width: number; height: number };
}

export function useImageJobs() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<ImageJob[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('image-jobs');
    return saved ? JSON.parse(saved) as ImageJob[] : [];
  });

  // Persistir no localStorage sempre que jobs mudar
  useEffect(() => {
    localStorage.setItem('image-jobs', JSON.stringify(jobs));
  }, [jobs, token]);

  // Iniciar polling de jobs pendentes
  useEffect(() => {
    if (!token) return;
    const intervals: NodeJS.Timeout[] = [];
    jobs.forEach(job => {
      if (job.status === 'loading') {
        const interval = setInterval(async () => {
          const status = await getJobStatus(job.id);
          if (!status) return;
          const jobStatus = status.status?.toUpperCase();
          if (jobStatus === 'COMPLETED' && status.imageUrls) {
            setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'done', urls: status.imageUrls } : j));
            clearInterval(interval);
            window.dispatchEvent(new Event('creditsUpdated'));
          }
          if (jobStatus === 'FAILED') {
            setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'done', urls: null } : j));
            clearInterval(interval);
          }
        }, 2000);
        intervals.push(interval);
      }
    });
    return () => {
      intervals.forEach(clearInterval);
    };
  }, [jobs, token]);

  // Criar um novo job e inserir placeholder
  const submitPrompt = async (prompt: string, resolution: { width: number; height: number }) => {
    const jobId = await createRunpodJob(prompt, resolution);
    const placeholder: ImageJob = { id: jobId, status: 'loading', urls: null, resolution };
    setJobs(prev => [placeholder, ...prev]);
    return jobId;
  };

  return { jobs, submitPrompt };
}
