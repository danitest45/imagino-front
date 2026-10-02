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
export async function createGeneration(request: GenerationRequest, key: string): Promise<GenerationJob> {
  const response = await fetchWithAuth(apiUrl('/api/generation/jobs'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(request),
  });
  return response.json();
}
export async function generationHistory(signal?: AbortSignal): Promise<GenerationJob[]> {
  return (await fetchWithAuth(apiUrl('/api/generation/jobs'), { signal })).json();
}
export async function cancelGeneration(id: string): Promise<GenerationJob> {
  return (await fetchWithAuth(apiUrl(`/api/generation/jobs/${id}/cancel`), { method: 'POST' })).json();
}
export async function generationDownload(id: string): Promise<Blob> {
  return (await fetchWithAuth(apiUrl(`/api/generation/jobs/${id}/download`))).blob();
}
