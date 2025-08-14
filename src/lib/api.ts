import type { ImageJobApi, UiJob } from '../types/image-job';


export async function createRunpodJob(prompt: string, options: {width: number; height: number;}) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/comfy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, negativePrompt: 'low quality, blurry', width: options.width, height: options.height, numInferenceSteps: 30, refinerInferenceSteps: 50, guidanceScale: 7.5, scheduler: 'K_EULER' })
  });
  const json = await res.json();
  return json.content.jobId as string;
}

export async function createReplicateJob(prompt: string, aspectRatio: string, token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/replicate/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt, aspectRatio }),
  });
  const json = await res.json();
  return json.content.jobId as string;
}

export async function getJobStatus(jobId: string, token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()).content;
}

export async function registerUser(email: string, password: string, username?: string) {
  const payload: Record<string, unknown> = { email, password };
  if (username) payload.username = username;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).message ?? 'Erro ao registrar');
  return (await res.json()) as { token: string; username: string };
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Credenciais inválidas');
  return (await res.json()) as { token: string; username: string };
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  phoneNumber?: string | null;
}

export async function getUserProfile(token: string): Promise<UserProfile> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar usuário');
  return (await res.json()) as UserProfile;
}

export async function updateUser(
  id: string,
  data: { username?: string; phoneNumber?: string | null },
  token: string,
): Promise<UserProfile> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).message ?? 'Erro ao atualizar usuário');
  return (await res.json()) as UserProfile;
}

export async function getUserHistory(token: string): Promise<ImageJobApi[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao carregar histórico');
  return (await res.json()) as ImageJobApi[];
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
