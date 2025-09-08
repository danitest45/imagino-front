import type { ImageJobApi, UiJob, JobDetails, LatestJob } from '../types/image-job';
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
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const code = data.code as string | undefined;
    if (res.status === 403 && code) {
      throw new Error(code);
    }
    throw new Error('Error creating job');
  }
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
  if (!res.ok) throw new Error('Error fetching job details');
  const json = await res.json();
  return {
    imageUrl: normalizeUrl(json.imageUrl) ?? '',
    prompt: json.prompt,
    username: json.username,
    createdAt: json.createdAt,
    aspectRatio: json.aspectRatio,
  };
}

export async function getLatestJobs(): Promise<LatestJob[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/latest`);
  if (!res.ok) throw new Error('Error loading jobs');
  const json = (await res.json()) as Array<Record<string, unknown>>;
  return json.map(j => ({
    id: String(j.id ?? j.jobId ?? j.jobID ?? ''),
    imageUrl: normalizeUrl(String(j.imageUrl ?? j.ImageUrl ?? '')) ?? '',
    prompt: String(j.prompt ?? j.Prompt ?? ''),
    username: (j.username ?? j.Username ?? null) as string | null,
    createdAt: String(j.createdAt ?? j.CreatedAt ?? ''),
    aspectRatio: (j.aspectRatio ?? j.AspectRatio ?? null) as string | null,
  }));
}

export async function registerUser(email: string, password: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Error registering');
  }
  // Backend now sends the verification e-mail instead of returning a token
  return (await res.json()) as { token?: string };
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const code = data.code as string | undefined;
    if (res.status === 403 && code) {
      const err = new Error(code);
      throw err;
    }
    throw new Error('Invalid credentials');
  }
  return (await res.json()) as { token: string };
}

export async function resendVerification(email: string) {
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function verifyEmail(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.code || 'TOKEN_INVALID');
  }
  return true;
}

export async function forgotPassword(email: string) {
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/password/forgot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.code || 'TOKEN_INVALID');
  }
  return true;
}

export async function getUserHistory(): Promise<ImageJobApi[]> {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/history`);
  if (!res.ok) throw new Error('Error loading history');
  return (await res.json()) as ImageJobApi[];
}

export async function getUserId(): Promise<string> {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/users`);
  if (!res.ok) throw new Error('Error getting user ID');
  const id = await res.text();
  return id.replace(/^"|"$/g, '');
}

export async function getUserById(id: string): Promise<UserDto> {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${id}`);
  if (!res.ok) throw new Error('Error fetching user');
  return (await res.json()) as UserDto;
}

export async function getCredits(): Promise<number> {
  const res = await fetchWithAuth(
    `${process.env.NEXT_PUBLIC_API_URL}/api/users/credits`,
  );
  if (!res.ok) throw new Error('Error fetching credits');
  const json = await res.json();
  return json.credits as number;
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
  if (!res.ok) throw new Error('Error updating user');
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
