'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { GenerationJob } from '../../types/generation';
import { generationDownload } from '../../lib/generation-api';
import { generationError } from '../../lib/generation';

export default function GenerationResult({ job, onReuse, onCancel }: {
  job: GenerationJob;
  onReuse: (job: GenerationJob) => void;
  onCancel: (id: string) => Promise<void>;
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (job.mediaType !== 'video' || job.status !== 'Completed') return;
    let current = true;
    let url: string | null = null;
    generationDownload(job.id).then(blob => {
      if (!current) return;
      url = URL.createObjectURL(blob);
      setVideoUrl(url);
    }).catch(e => { if (current) setError(generationError(e)); });
    return () => { current = false; if (url) URL.revokeObjectURL(url); };
  }, [job.id, job.mediaType, job.status]);
  async function download() {
    try {
      const blob = await generationDownload(job.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `imagino-${job.id}.${blob.type === 'video/mp4' ? 'mp4' : blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png'}`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(generationError(e)); }
  }
  const state = job.creditState === 'Refunded' ? 'Credits returned' : `${job.credits} credits ${job.creditState.toLowerCase()}`;
  return <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
    {job.status === 'Completed' && job.outputUrl && job.mediaType === 'image' ?
      <div className="relative h-64 bg-black/30"><Image src={`/api/images/optimize?url=${encodeURIComponent(job.outputUrl)}&width=1024`} alt={job.prompt} fill sizes="(max-width: 768px) 100vw, 50vw" unoptimized className="object-contain" /></div> : null}
    {videoUrl ? <video src={videoUrl} controls className="w-full" aria-label={job.prompt} /> : null}
    <div className="space-y-3 p-4">
      <div className="flex justify-between gap-2 text-sm"><strong>{job.displayName}</strong><span className={job.status === 'Failed' ? 'text-red-300' : 'text-purple-200'}>{job.status}</span></div>
      <p className="line-clamp-3 text-sm text-gray-300">{job.prompt}</p>
      <p className="text-xs text-gray-400">{state} · {new Date(job.createdAt).toLocaleString()}</p>
      {job.errorCode ? <p className="text-sm text-red-200">{job.errorCode === 'synthetic_provider_failure' ? 'The demo simulated a provider failure.' : 'Generation could not finish.'} Your credits were returned.</p> : null}
      {error ? <p role="alert" className="text-sm text-red-200">{error}</p> : null}
      <div className="flex flex-wrap gap-3 text-sm">
        <button type="button" onClick={() => onReuse(job)} className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20">Reuse prompt & settings</button>
        {job.status === 'Completed' ? <button type="button" onClick={download} className="rounded-lg bg-purple-500/20 px-3 py-2 text-purple-100 hover:bg-purple-500/30">Download</button> : null}
        {job.status === 'Queued' ? <button type="button" onClick={() => onCancel(job.id).catch(e => setError(generationError(e)))} className="rounded-lg px-3 py-2 text-gray-300 hover:bg-white/10">Cancel</button> : null}
      </div>
    </div>
  </article>;
}
