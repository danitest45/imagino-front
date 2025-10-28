'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createImageJob, getImageModelDetails, getJobStatus } from '../../../lib/api';
import type { PublicImageModelDetails } from '../../../types/image-model';
import type { Problem } from '../../../lib/errors';

interface GenerationResult {
  jobId: string;
  prompt: string;
  status: 'loading' | 'completed' | 'failed';
  images: string[];
  error?: string | null;
}

interface ImageModelClientProps {
  slug: string;
}

const POLL_INTERVAL_MS = 2000;

function isProblem(value: unknown): value is Problem {
  return Boolean(value) && typeof value === 'object' && 'status' in (value as Record<string, unknown>);
}

function extractImageUrls(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as Record<string, unknown>;
  const fromImageUrls = data.imageUrls;
  if (Array.isArray(fromImageUrls)) {
    return fromImageUrls.filter((url): url is string => typeof url === 'string');
  }
  const fromOutput = data.output;
  if (Array.isArray(fromOutput)) {
    return fromOutput.filter((url): url is string => typeof url === 'string');
  }
  if (typeof data.imageUrl === 'string') {
    return [data.imageUrl];
  }
  const fromImages = data.images;
  if (Array.isArray(fromImages)) {
    return fromImages.filter((url): url is string => typeof url === 'string');
  }
  return [];
}

export default function ImageModelClient({ slug }: ImageModelClientProps) {
  const [model, setModel] = useState<PublicImageModelDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Problem | Error | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedVersionTag, setSelectedVersionTag] = useState<string | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const mountedRef = useRef(true);
  const slugRef = useRef(slug);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    slugRef.current = slug;
  }, [slug]);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError(null);
    setModel(null);
    setHistory([]);
    setSelectedPresetId(null);
    setSubmitError(null);
    (async () => {
      try {
        const data = await getImageModelDetails(slug);
        if (!isActive) return;
        setModel(data);
        const preferredVersion = data.defaultVersionTag ?? data.versions?.[0]?.versionTag ?? null;
        setSelectedVersionTag(preferredVersion ?? null);
        setLoading(false);
      } catch (err) {
        if (!isActive) return;
        const problem = isProblem(err)
          ? err
          : err instanceof Error
            ? err
            : new Error('Erro ao carregar modelo');
        setError(problem);
        setLoading(false);
      }
    })();
    return () => {
      isActive = false;
      timeoutsRef.current.forEach(timeoutId => window.clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, [slug]);

  const defaultVersionTag = useMemo(() => {
    if (!model) return null;
    return model.defaultVersionTag ?? model.versions?.[0]?.versionTag ?? null;
  }, [model]);

  useEffect(() => {
    if (model) {
      const preferred = model.defaultVersionTag ?? model.versions?.[0]?.versionTag ?? null;
      setSelectedVersionTag(preferred ?? null);
    }
  }, [model]);

  const pollJobStatus = async (jobId: string) => {
    try {
      const status = await getJobStatus(jobId);
      if (!mountedRef.current) {
        return;
      }
      if (slugRef.current !== slug) {
        return;
      }
      const normalizedStatus = typeof status.status === 'string' ? status.status.toLowerCase() : '';
      if (normalizedStatus === 'completed') {
        const images = extractImageUrls(status);
        if (!mountedRef.current || slugRef.current !== slug) {
          return;
        }
        setHistory(prev =>
          prev.map(entry =>
            entry.jobId === jobId
              ? { ...entry, status: 'completed', images, error: null }
              : entry,
          ),
        );
        setIsGenerating(false);
        return;
      }
      if (normalizedStatus === 'failed') {
        const message = typeof status.detail === 'string' ? status.detail : 'Falha ao gerar imagem.';
        if (!mountedRef.current || slugRef.current !== slug) {
          return;
        }
        setHistory(prev =>
          prev.map(entry =>
            entry.jobId === jobId
              ? { ...entry, status: 'failed', error: message }
              : entry,
          ),
        );
        setIsGenerating(false);
        return;
      }
      if (!mountedRef.current || slugRef.current !== slug) {
        return;
      }
      const timeoutId = window.setTimeout(() => {
        void pollJobStatus(jobId);
      }, POLL_INTERVAL_MS);
      timeoutsRef.current.push(timeoutId);
    } catch (err) {
      if (!mountedRef.current || slugRef.current !== slug) {
        return;
      }
      const message = isProblem(err)
        ? err.detail ?? err.title ?? 'Erro ao acompanhar job.'
        : err instanceof Error
          ? err.message
          : 'Erro ao acompanhar job.';
      setHistory(prev =>
        prev.map(entry =>
          entry.jobId === jobId
            ? { ...entry, status: 'failed', error: message }
            : entry,
        ),
      );
      setIsGenerating(false);
    }
  };

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(current => (current === presetId ? null : presetId));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!model) return;
    if (!prompt.trim()) {
      setSubmitError('Digite um prompt para gerar imagens.');
      return;
    }
    const versionTag = selectedPresetId ? null : selectedVersionTag ?? defaultVersionTag;
    if (!selectedPresetId && !versionTag) {
      setSubmitError('Este modelo não possui versão disponível para geração.');
      return;
    }

    try {
      setSubmitError(null);
      setIsGenerating(true);
      const body = selectedPresetId
        ? { presetId: selectedPresetId, params: { prompt } }
        : { model: model.slug.toLowerCase(), version: versionTag, params: { prompt } };
      const { jobId } = await createImageJob(body);
      setHistory(prev => [{ jobId, prompt, status: 'loading', images: [] }, ...prev]);
      void pollJobStatus(jobId);
    } catch (err) {
      setIsGenerating(false);
      const message = isProblem(err)
        ? err.detail ?? err.title ?? 'Não foi possível criar o job.'
        : err instanceof Error
          ? err.message
          : 'Não foi possível criar o job.';
      setSubmitError(message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-200">
        <p>Carregando modelo...</p>
      </div>
    );
  }

  if (error) {
    if (isProblem(error) && error.status === 404) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center text-white">
          <h2 className="text-2xl font-semibold">Modelo não encontrado</h2>
          <p className="text-sm text-gray-300">O modelo solicitado não está disponível.</p>
          <Link
            href="/images"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white hover:bg-white/10"
          >
            Voltar
          </Link>
        </div>
      );
    }
    const message = isProblem(error)
      ? error.detail ?? error.title ?? 'Erro ao carregar modelo.'
      : error.message;
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-200">
        <p>{message}</p>
      </div>
    );
  }

  if (!model) {
    return null;
  }

  const presets = model.presets ?? [];
  const versions = model.versions ?? [];
  const resolvedVersionTag = selectedVersionTag ?? defaultVersionTag;

  return (
    <div className="px-6 py-10 text-gray-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-200">{model.visibility === 'public' ? 'Public' : 'Premium'}</p>
          <h1 className="text-3xl font-semibold text-white">{model.displayName}</h1>
          <p className="text-sm text-gray-400">Status: {model.status}</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Versões disponíveis</h2>
          {versions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {versions.map(version => {
                const isActive = resolvedVersionTag === version.versionTag;
                return (
                  <button
                    key={version.versionTag}
                    type="button"
                    onClick={() => setSelectedVersionTag(version.versionTag)}
                    className={`rounded-full border px-3 py-1 text-sm transition ${
                      isActive
                        ? 'border-fuchsia-400 bg-fuchsia-500/20 text-white'
                        : 'border-white/20 text-gray-200 hover:border-fuchsia-400/60'
                    }`}
                  >
                    {version.versionTag}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nenhuma versão listada.</p>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Presets</h2>
            {selectedPresetId && (
              <button
                type="button"
                className="text-xs text-fuchsia-200 hover:text-fuchsia-100"
                onClick={() => setSelectedPresetId(null)}
              >
                Limpar seleção
              </button>
            )}
          </div>
          {presets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {presets.map(preset => {
                const active = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 transition ${
                      active ? 'border-fuchsia-400 bg-fuchsia-500/15' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div>
                      <h3 className="text-base font-semibold text-white">{preset.name}</h3>
                      {preset.description && (
                        <p className="mt-1 text-sm text-gray-300">{preset.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePresetSelect(preset.id)}
                      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold transition ${
                        active
                          ? 'bg-white text-black'
                          : 'border border-white/20 text-white hover:border-fuchsia-400 hover:text-fuchsia-100'
                      }`}
                    >
                      {active ? 'Selecionado' : 'Usar preset'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nenhum preset disponível para este modelo.</p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Gerar imagem</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={prompt}
              onChange={event => {
                setPrompt(event.target.value);
                if (submitError) {
                  setSubmitError(null);
                }
              }}
              placeholder="Descreva a imagem que deseja gerar..."
              className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white placeholder:text-gray-400 focus:border-fuchsia-400 focus:outline-none"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-gray-400">
                {selectedPresetId
                  ? 'Gerando com preset selecionado.'
                  : resolvedVersionTag
                    ? `Versão selecionada: ${resolvedVersionTag}`
                    : 'Nenhuma versão selecionada.'}
              </div>
              <button
                type="submit"
                disabled={isGenerating}
                className="inline-flex items-center justify-center rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? 'Gerando...' : 'Gerar'}
              </button>
            </div>
            {submitError && <p className="text-sm text-rose-300">{submitError}</p>}
          </form>
        </section>

        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-white">Histórico desta sessão</h2>
          {history.length === 0 && <p className="text-sm text-gray-400">Nenhuma geração ainda.</p>}
          {history.map(entry => (
            <div key={entry.jobId} className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-300">
                  <span className="font-semibold text-white">Prompt:</span> {entry.prompt}
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                    entry.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : entry.status === 'failed'
                        ? 'bg-rose-500/20 text-rose-200'
                        : 'bg-amber-500/20 text-amber-200'
                  }`}
                >
                  {entry.status === 'completed'
                    ? 'Completo'
                    : entry.status === 'failed'
                      ? 'Falhou'
                      : 'Processando'}
                </span>
              </div>
              {entry.error && <p className="text-sm text-rose-300">{entry.error}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {entry.status === 'loading' && (
                  <div className="flex h-48 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-sm text-gray-400">
                    Aguardando resultado...
                  </div>
                )}
                {entry.status === 'completed' && entry.images.length === 0 && (
                  <div className="flex h-48 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-sm text-gray-400">
                    Nenhuma imagem retornada.
                  </div>
                )}
                {entry.images.map((imageUrl, index) => (
                  <figure
                    key={`${entry.jobId}-${index}`}
                    className="overflow-hidden rounded-xl border border-white/10 bg-black/30"
                  >
                    <img
                      src={imageUrl}
                      alt={`Resultado ${index + 1} para o prompt ${entry.prompt}`}
                      className="h-full w-full object-cover"
                    />
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
