'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { getJobDetails } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { JobDetails } from '../types/image-job';
import { downloadJob } from '../lib/download';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  jobId: string | null;
  fallbackUrl?: string;
};

/**
 * Modal para exibir detalhes de uma imagem buscando dados do backend.
 */
export default function ImageCardModal({ isOpen, onClose, jobId, fallbackUrl }: Props) {
  const { token } = useAuth();
  const [details, setDetails] = useState<JobDetails | null>(null);

  useEffect(() => {
    if (!isOpen || !jobId || !token) {
      setDetails(null);
      return;
    }

    setDetails(null);
    let ignore = false;
    (async () => {
      try {
        const data = await getJobDetails(jobId);
        if (!ignore) setDetails(data);
      } catch {
        if (!ignore) setDetails(null);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [isOpen, jobId, token]);

  const date = useMemo(() => {
    if (!details) return '';
    try {
      return new Date(details.createdAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }, [details]);
  const imageUrl = details?.imageUrl ?? fallbackUrl;
  if (!isOpen) return null;
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-10 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 shadow-2xl shadow-purple-500/20 backdrop-blur-xl md:h-auto md:max-h-[90vh] md:flex-row"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white transition hover:bg-black/60"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex flex-1 items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black p-4 sm:p-8">
          <div className="absolute inset-4 rounded-[28px] border border-white/5" aria-hidden />
          <img src={imageUrl} alt="Imagem gerada" className="relative max-h-full max-w-full rounded-[22px] object-contain shadow-2xl" />
        </div>

        <aside className="flex w-full flex-col gap-5 border-t border-white/5 bg-black/40 p-6 text-sm text-gray-200 md:w-96 md:border-l md:border-t-0 md:bg-black/30">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-fuchsia-200">Projeto</p>
              <h3 className="text-lg font-semibold text-white">{details?.username ?? 'Artista'}</h3>
              <p className="text-xs text-gray-400">{date}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {details?.aspectRatio && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                  {details.aspectRatio}
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                IA generativa
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20 hover:bg-white/15"
                disabled
              >
                <Share2 className="h-4 w-4" />
                Compartilhar em breve
              </button>
              {jobId && (
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50"
                  onClick={() => downloadJob(jobId)}
                >
                  <Download className="h-4 w-4" />
                  Baixar
                </button>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Prompt criativo</h4>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-gray-200">
                {details?.prompt ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{details.prompt}</p>
                ) : (
                  <div className="space-y-2">
                    <span className="block h-3 w-3/4 rounded-full bg-white/10" />
                    <span className="block h-3 w-2/3 rounded-full bg-white/10" />
                    <span className="block h-3 w-1/2 rounded-full bg-white/10" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
