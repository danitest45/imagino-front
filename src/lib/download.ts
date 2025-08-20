import type { MouseEvent } from 'react';

const R2_PUBLIC_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE!;

export function extractKeyFromSrc(src: string) {
  try {
    const u = new URL(src);
    return u.pathname.replace(/^\//, '');
  } catch {
    return src.replace(`${R2_PUBLIC_BASE}/`, '');
  }
}

export async function handleDownload(e: MouseEvent, src: string, prompt: string) {
  e.stopPropagation();
  const key = extractKeyFromSrc(src);
  const params = new URLSearchParams({ key, prompt });
  const res = await fetch(`/api/files/download-url?${params.toString()}`);
  const data = await res.json();
  window.location.href = data.url;
}
