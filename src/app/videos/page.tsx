'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { createVideoJob, getVideoJobStatus } from '../../lib/api';

const DURATIONS = ['4', '6', '8'];
const RESOLUTIONS = ['720p', '1080p'];

const DEFAULT_VIDEO_MODEL = process.env.NEXT_PUBLIC_DEFAULT_VIDEO_MODEL ?? 'default-video-model';

interface VideoJob {
  id: string;
  status: string;
  prompt: string;
  duration: string;
  resolution: string;
  videoUrl?: string | null;
  referenceName?: string;
}

export default function VideosPage() {
  const searchParams = useSearchParams();
  const modelSlug = useMemo(
    () => searchParams?.get('modelSlug') ?? DEFAULT_VIDEO_MODEL,
    [searchParams],
  );

  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(DURATIONS[1]);
  const [resolution, setResolution] = useState(RESOLUTIONS[1]);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => () => {
    pollersRef.current.forEach(intervalId => window.clearInterval(intervalId));
    pollersRef.current.clear();
  }, []);

  const updateJob = (jobId: string, data: Partial<VideoJob>) => {
    setJobs(prev => prev.map(job => (job.id === jobId ? { ...job, ...data } : job)));
  };

  const startPolling = (jobId: string) => {
    if (pollersRef.current.has(jobId)) return;

    const intervalId = window.setInterval(async () => {
      try {
        const statusResponse = await getVideoJobStatus(jobId);
        const normalizedStatus = (statusResponse.status ?? '').toUpperCase();
        const isCompleted = normalizedStatus === 'COMPLETED';
        const isFailed = normalizedStatus === 'FAILED';

        updateJob(jobId, {
          status: normalizedStatus || 'PROCESSING',
          videoUrl: statusResponse.videoUrl ?? undefined,
        });

        if (isCompleted || isFailed) {
          const poller = pollersRef.current.get(jobId);
          if (poller) {
            window.clearInterval(poller);
            pollersRef.current.delete(jobId);
          }
        }
      } catch (err) {
        console.error('Unable to poll video job', err);
      }
    }, 3500);

    pollersRef.current.set(jobId, intervalId);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) {
      setError('Digite um prompt para gerar o vídeo.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const params: Record<string, unknown> = {
        prompt,
        duration,
        resolution,
      };

      if (referenceImage) {
        params.referenceImage = referenceImage;
      }

      const response = await createVideoJob(modelSlug, params);
      if (!response.jobId) {
        throw new Error('Não foi possível criar o job de vídeo.');
      }

      const newJob: VideoJob = {
        id: response.jobId,
        status: (response.status ?? 'PROCESSING').toUpperCase(),
        prompt,
        duration,
        resolution,
        videoUrl: response.videoUrl ?? undefined,
        referenceName: referenceImage?.name,
      };

      setJobs(prev => [newJob, ...prev]);

      if (
        newJob.status !== 'FAILED'
        && (!response.videoUrl || newJob.status !== 'COMPLETED')
      ) {
        startPolling(response.jobId);
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Erro ao criar o job de vídeo.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-950 to-black text-white">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-fuchsia-300/80">Geração de vídeos</p>
            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Crie vídeos com IA</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-300">
              Forneça um prompt, defina a duração e a resolução. Opcionalmente, envie uma imagem de referência.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-gray-200">
            Modelo em uso: <span className="font-semibold text-white">{modelSlug}</span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-fuchsia-500/10"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-200" htmlFor="prompt">
                Prompt <span className="text-fuchsia-300">*</span>
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                required
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white shadow-inner shadow-black/30 focus:border-fuchsia-400/60 focus:outline-none"
                placeholder="Descreva a cena ou animação que deseja gerar"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200" htmlFor="duration">
                Duração <span className="text-fuchsia-300">*</span>
              </label>
              <select
                id="duration"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white shadow-inner shadow-black/30 focus:border-fuchsia-400/60 focus:outline-none"
              >
                {DURATIONS.map(value => (
                  <option key={value} value={value}>
                    {value} segundos
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200" htmlFor="resolution">
                Resolução <span className="text-fuchsia-300">*</span>
              </label>
              <select
                id="resolution"
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white shadow-inner shadow-black/30 focus:border-fuchsia-400/60 focus:outline-none"
              >
                {RESOLUTIONS.map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-200" htmlFor="referenceImage">
                Imagem de referência (opcional)
              </label>
              <input
                id="referenceImage"
                type="file"
                accept="image/*"
                onChange={event => setReferenceImage(event.target.files?.[0] ?? null)}
                className="block w-full rounded-xl border border-dashed border-white/15 bg-black/30 px-4 py-3 text-sm text-gray-200 file:mr-4 file:rounded-lg file:border-0 file:bg-fuchsia-500/90 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-fuchsia-400/60"
              />
              {referenceImage && (
                <p className="text-xs text-gray-400">Arquivo selecionado: {referenceImage.name}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:shadow-purple-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Gerando...' : 'Gerar vídeo'}
            </button>
            <p className="text-xs text-gray-400">Você verá o job na lista assim que o processamento começar.</p>
          </div>
        </form>

        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-fuchsia-300/80">Histórico</p>
              <h2 className="text-xl font-semibold text-white">Seus jobs de vídeo</h2>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300">
              {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
            </span>
          </div>

          {jobs.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-gray-300">
              Nenhum vídeo criado ainda. Envie um prompt para começar.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {jobs.map(job => {
                const isFailed = job.status === 'FAILED';
                const isCompleted = job.status === 'COMPLETED';

                return (
                  <div
                    key={job.id}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-black/60 p-4 shadow-xl shadow-black/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200/80">{job.id}</p>
                        <p className="mt-1 text-lg font-semibold text-white line-clamp-2">{job.prompt}</p>
                        <p className="mt-1 text-xs text-gray-400">{job.duration}s • {job.resolution}</p>
                        {job.referenceName && (
                          <p className="text-xs text-gray-400">Ref: {job.referenceName}</p>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-100'
                            : isFailed
                              ? 'bg-red-500/20 text-red-100'
                              : 'bg-yellow-500/20 text-yellow-100'
                        }`}
                      >
                        {isCompleted ? 'Concluído' : isFailed ? 'Falhou' : 'Em processamento'}
                      </span>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/60">
                      {job.videoUrl && isCompleted ? (
                        <div className="space-y-3 p-3">
                          <video
                            src={job.videoUrl}
                            controls
                            className="aspect-video w-full rounded-lg bg-black"
                          />
                          <div className="flex flex-wrap gap-2 text-xs">
                            <a
                              href={job.videoUrl}
                              download
                              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 font-semibold text-white transition hover:bg-white/20"
                            >
                              Baixar
                            </a>
                            <a
                              href={job.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 font-semibold text-white transition hover:border-fuchsia-400/60"
                            >
                              Abrir em nova aba
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-h-[200px] items-center justify-center bg-[radial-gradient(circle_at_top,_#2a1a3d,_#05030c)] p-6 text-center">
                          {isFailed ? (
                            <p className="text-sm text-red-100">Não foi possível gerar o vídeo.</p>
                          ) : (
                            <div className="space-y-2 text-sm text-gray-200">
                              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-fuchsia-400/70 border-t-transparent" />
                              <p>Seu vídeo está sendo processado...</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
