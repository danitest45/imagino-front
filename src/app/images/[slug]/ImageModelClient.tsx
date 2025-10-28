/* eslint-disable @next/next/no-img-element */
'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createImageJob,
  getImageModelDetails,
  getJobStatus,
  normalizeUrl,
  type ImageModelDetails,
} from '../../../lib/api';

const sizeOptions = {
  Small: { label: 'Small (768×768)', width: 768, height: 768 },
  Medium: { label: 'Medium (1024×1024)', width: 1024, height: 1024 },
  Large: { label: 'Large (1536×1536)', width: 1536, height: 1536 },
} as const;

type SizeKey = keyof typeof sizeOptions;

const qualityOptions = {
  Normal: { label: 'Normal', output_quality: 80, enhance_prompt: false },
  Alta: { label: 'Alta', output_quality: 95, enhance_prompt: true },
} as const;

type QualityKey = keyof typeof qualityOptions;

type GenerationStatus = 'idle' | 'pending' | 'completed' | 'failed';

interface ImageModelClientProps {
  slug: string;
}

export default function ImageModelClient({ slug }: ImageModelClientProps) {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<SizeKey>('Medium');
  const [quality, setQuality] = useState<QualityKey>('Normal');
  const [model, setModel] = useState<ImageModelDetails | null>(null);
  const [versionTag, setVersionTag] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingModel(true);
    setError(null);
    setModel(null);
    setVersionTag(null);
    setPrompt('');
    setImageUrl(null);
    setStatus('idle');
    setJobId(null);

    async function loadModel() {
      try {
        const details = await getImageModelDetails(slug);
        if (!isMounted) return;
        setModel(details);
        const resolvedVersion = details.defaultVersionTag ?? details.versions?.[0]?.tag ?? null;
        setVersionTag(resolvedVersion);
        if (!resolvedVersion) {
          setError('No available version for this model.');
        }
      } catch {
        if (!isMounted) return;
        setError('Failed to load model details.');
      } finally {
        if (isMounted) {
          setLoadingModel(false);
        }
      }
    }

    loadModel();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      if (cancelled) return;
      const content = await getJobStatus(jobId);
      if (!content) return;

      const rawStatus = typeof content.status === 'string' ? content.status.toLowerCase() : '';
      const rawUrl =
        (typeof content.imageUrl === 'string' ? content.imageUrl : null) ??
        (Array.isArray(content.imageUrls) ? content.imageUrls[0] : null);

      if (rawStatus === 'completed') {
        const finalUrl = normalizeUrl(rawUrl);
        setImageUrl(finalUrl);
        setStatus('completed');
        setIsGenerating(false);
        setJobId(null);
        if (interval) clearInterval(interval);
        return;
      }

      if (rawStatus === 'failed') {
        setStatus('failed');
        setIsGenerating(false);
        setJobId(null);
        if (interval) clearInterval(interval);
        return;
      }

      setStatus('pending');
    }

    poll();
    interval = setInterval(poll, 2000);

    return () => {
      cancelled = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [jobId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) {
      setError('Enter a prompt to generate an image.');
      return;
    }
    if (!versionTag) {
      setError('No available version for this model.');
      return;
    }

    const selectedSize = sizeOptions[size];
    const selectedQuality = qualityOptions[quality];

    setError(null);
    setStatus('pending');
    setIsGenerating(true);
    setImageUrl(null);

    try {
      const payload = {
        model: slug,
        version: versionTag,
        params: {
          prompt,
          width: selectedSize.width,
          height: selectedSize.height,
          output_quality: selectedQuality.output_quality,
          enhance_prompt: selectedQuality.enhance_prompt,
        },
      };

      const newJobId = await createImageJob(payload);
      setJobId(newJobId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start generation.';
      setError(message);
      setIsGenerating(false);
      setStatus('idle');
    }
  };

  const sizeOptionsList = useMemo(() => Object.entries(sizeOptions) as [SizeKey, typeof sizeOptions[SizeKey]][], []);
  const qualityOptionsList = useMemo(
    () => Object.entries(qualityOptions) as [QualityKey, typeof qualityOptions[QualityKey]][],
    [],
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">{model?.name ?? slug}</h1>
        <p className="text-sm text-gray-300">
          Provide a prompt, choose a size and quality, then generate your image.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white" htmlFor="prompt">
            Prompt
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            placeholder="Describe the image you want to create"
            className="h-32 w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white outline-none transition focus:border-fuchsia-400 focus:ring-0"
            disabled={loadingModel || isGenerating}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white" htmlFor="size">
              Tamanho
            </label>
            <select
              id="size"
              value={size}
              onChange={event => setSize(event.target.value as SizeKey)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-fuchsia-400 focus:outline-none"
              disabled={loadingModel || isGenerating}
            >
              {sizeOptionsList.map(([key, option]) => (
                <option key={key} value={key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white" htmlFor="quality">
              Qualidade
            </label>
            <select
              id="quality"
              value={quality}
              onChange={event => setQuality(event.target.value as QualityKey)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-fuchsia-400 focus:outline-none"
              disabled={loadingModel || isGenerating}
            >
              {qualityOptionsList.map(([key, option]) => (
                <option key={key} value={key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/40 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loadingModel || isGenerating}
        >
          {loadingModel ? 'Loading model…' : isGenerating ? 'Generating…' : 'Gerar'}
        </button>
      </form>

      <section className="space-y-4">
        <div className="text-sm text-gray-300">
          {status === 'pending' && 'Generating image…'}
          {status === 'completed' && 'Image generated successfully.'}
          {status === 'failed' && 'Generation failed. Try again with another prompt.'}
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-6">
          {imageUrl ? (
            <img src={imageUrl} alt="Generated" className="mx-auto max-h-[520px] w-full rounded-2xl object-contain" />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">
              {status === 'pending' ? 'Waiting for the image…' : 'Your generated image will appear here.'}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
