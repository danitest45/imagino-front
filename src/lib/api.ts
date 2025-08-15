import type { ImageJobApi, UiJob, JobDetails } from '../types/image-job';
import type { UserDto } from '../types/user';
import { fetchWithAuth } from './auth';


export async function createRunpodJob(prompt: string, options: {width: number; height: number;}) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/comfy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, negativePrompt: 'low quality, blurry', width: options.width, height: options.height, numInferenceSteps: 30, refinerInferenceSteps: 50, guidanceScale: 7.5, scheduler: 'K_EULER' })
  });
  const json = await res.json();
  return json.content.jobId as string;
}

export async function createReplicateJob(prompt: string, aspectRatio: string) {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/replicate/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, aspectRatio }),
  });
  const json = await res.json();
  return json.content.jobId as string;
}

export async function getJobStatus(jobId: string) {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}`);
  if (!res.ok) return null;
  return (await res.json()).content;
}

export async function getJobDetails(jobId: string): Promise<JobDetails> {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/details/${jobId}`);
  if (!res.ok) throw new Error('Erro ao obter detalhes do job');
  const json = await res.json();
  return {
    imageUrl: normalizeUrl(json.imageUrl) ?? '',
    prompt: json.prompt,
    username: json.username,
    createdAt: json.createdAt,
    aspectRatio: json.aspectRatio,
  };
}

export async function registerUser(email: string, password: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json()).message ?? 'Erro ao registrar');
  return (await res.json()) as { token: string };
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Credenciais inválidas');
  return (await res.json()) as { token: string };
}

export async function getUserHistory(): Promise<ImageJobApi[]> {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/history`);
  if (!res.ok) throw new Error('Erro ao carregar histórico');
  return (await res.json()) as ImageJobApi[];
}

export async function getUserId(): Promise<string> {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/users`);
  if (!res.ok) throw new Error('Erro ao obter ID do usuário');
  const id = await res.text();
  return id.replace(/^"|"$/g, '');
}

export async function getUserById(id: string): Promise<UserDto> {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${id}`);
  if (!res.ok) throw new Error('Erro ao obter usuário');
  return (await res.json()) as UserDto;
}

export async function updateUser(
  id: string,
  dto: Partial<UserDto>,
): Promise<UserDto> {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Erro ao atualizar usuário');
  return (await res.json()) as UserDto;
}

export function mapApiToUiJob(j: ImageJobApi): UiJob {
  const rawUrl = j.imageUrl ?? j.imageUrls?.[0] ?? null;     // <<<<<< pega singular OU primeira do array
  return {
    id: j.jobId || j.id,
    status: j.status?.toUpperCase() === 'COMPLETED' ? 'done' : 'loading',
    url: normalizeUrl(rawUrl),                               // <<<<<< normaliza
    aspectRatio: j.aspectRatio ?? '1:1',
  };
}

export function normalizeUrl(pathOrUrl?: string | null): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  const base = process.env.NEXT_PUBLIC_API_URL ?? '';
  return `${base}${pathOrUrl}`;
}
