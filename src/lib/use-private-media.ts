"use client";

import { useEffect, useRef, useState } from 'react';
import { generationMedia } from './generation-api';
import { generationError } from './generation';
import type { GenerationJob } from '../types/generation';

/** Object URLs exist only in this mounted owner view and are never persisted. */
export function usePrivateMedia(job: GenerationJob, enabled: boolean, lazy = false) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(!lazy);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!lazy || !ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '100px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [lazy, job.id]);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setUrl(null); setError(null); setLoading(false);
    const clear = () => {
      controller.abort();
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
      setUrl(null); setLoading(false);
    };
    window.addEventListener('imagino-session-change', clear);
    if (enabled && visible && job.status === 'Completed') {
      setLoading(true);
      generationMedia(job.id, controller.signal).then(blob => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
      }).catch(e => { if (!controller.signal.aborted) setError(generationError(e)); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }
    return () => { window.removeEventListener('imagino-session-change', clear); controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [job.id, job.status, enabled, visible]);
  return { ref, url, loading, error };
}
