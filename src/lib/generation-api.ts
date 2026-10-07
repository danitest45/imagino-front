import { apiFetch } from './api-client';
import { fetchWithAuth } from './auth';
import { apiUrl } from './config';
import type { GenerationJob, GenerationModel, GenerationQuote, GenerationRequest } from '../types/generation';

export async function generationCatalog(signal?: AbortSignal): Promise<GenerationModel[]> {
  const response = await apiFetch('/api/generation/catalog', { signal });
  const catalog = await response.json();
  return catalog.models;
}
export async function quoteGeneration(request: GenerationRequest, signal?: AbortSignal): Promise<GenerationQuote> {
  const response = await fetchWithAuth(apiUrl('/api/generation/quote'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal,
  });
  return response.json();
}
export async function createGeneration(request: GenerationRequest, key: string, signal?: AbortSignal): Promise<GenerationJob> {
  const response = await fetchWithAuth(apiUrl('/api/generation/jobs'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(request), signal,
  });
  return response.json();
}
export async function generationHistory(signal?: AbortSignal): Promise<GenerationJob[]> {
  return (await fetchWithAuth(apiUrl('/api/generation/jobs'), { signal })).json();
}
export async function cancelGeneration(id: string, signal?: AbortSignal): Promise<GenerationJob> {
  return (await fetchWithAuth(apiUrl(`/api/generation/jobs/${encodeURIComponent(id)}/cancel`), { method: 'POST', signal })).json();
}
export async function generationDownload(id: string, signal?: AbortSignal): Promise<Blob> {
  return privateGenerationBytes(id, 'download', signal);
}
export async function generationMedia(id: string, signal?: AbortSignal): Promise<Blob> {
  return privateGenerationBytes(id, 'media', signal);
}
async function privateGenerationBytes(id: string, endpoint: 'media' | 'download', signal?: AbortSignal): Promise<Blob> {
  const response = await fetchWithAuth(apiUrl(`/api/generation/jobs/${encodeURIComponent(id)}/${endpoint}`), { signal, cache: 'no-store' });
  const mime = response.headers.get('content-type')?.split(';')[0];
  if (!mime || !['image/png', 'image/jpeg', 'image/webp', 'video/mp4'].includes(mime)) throw new Error('Media format is unavailable.');
  const limit = mime === 'video/mp4' ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
  if (Number(response.headers.get('content-length') ?? 0) > limit) throw new Error('Media exceeds the download limit.');
  if (!response.body) throw new Error('Media is unavailable.');
  const reader = response.body.getReader();
  const parts: BlobPart[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('Media exceeds the download limit.');
      parts.push(new Uint8Array(value));
    }
  } catch (error) { await reader.cancel(); throw error; }
  finally { reader.releaseLock(); }
  return new Blob(parts, { type: mime });
}
