import type { ImageJobApi, UiJob, JobDetails, LatestJob } from '../types/image-job';
import type { UserDto } from '../types/user';
import { fetchWithAuth } from './auth';
import { apiFetch } from './api-client';
import { apiUrl, API_BASE_URL } from './config';


export async function getReplicateModels() {
  const res = await apiFetch(apiUrl('/api/replicate/models'));
  return (await res.json()) as Array<{ id: string; title: string; description: string }>;
}


export async function createRunpodJob(
  prompt: string,
  options: { width: number; height: number },
) {
  const res = await fetchWithAuth(
    apiUrl('/api/comfy'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        negativePrompt: 'low quality, blurry',
        width: options.width,
        height: options.height,
        numInferenceSteps: 30,
        refinerInferenceSteps: 50,
        guidanceScale: 7.5,
        scheduler: 'K_EULER',
      }),
    },
  );
  const json = await res.json();
  return json.content.jobId as string;
}

export async function createReplicateJob(
  prompt: string,
  aspectRatio: string,
  quality?: number,
  modelId = 'flux-dev',
) {
  const body: {
    prompt: string;
    aspectRatio: string;
    modelId: string;
    qualityLevel?: number;
  } = { prompt, aspectRatio, modelId };
  if (typeof quality === 'number') body.qualityLevel = quality;
  const res = await fetchWithAuth(apiUrl('/api/replicate/jobs'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const jobId =
    typeof json === 'string'
      ? json
      : (json?.jobId ??
          json?.jobID ??
          json?.id ??
          json?.content?.jobId ??
          json?.content?.jobID ??
          json?.content?.id ??
          null);

  if (!jobId) {
    throw new Error('Replicate job response did not include a jobId');
  }

  return String(jobId);
}

export async function getJobStatus(jobId: string) {
  try {
    const res = await fetchWithAuth(
      apiUrl(`/api/jobs/${jobId}`),
    );
    return (await res.json()).content;
  } catch {
    return null;
  }
}

export async function getJobDetails(jobId: string): Promise<JobDetails> {
  const res = await fetchWithAuth(
    apiUrl(`/api/jobs/details/${jobId}`),
  );
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
  const res = await apiFetch(
    apiUrl('/api/jobs/latest'),
  );
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
  const res = await apiFetch(
    apiUrl('/api/auth/register'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
  );
  return (await res.json()) as { token: string };
}

export async function loginUser(email: string, password: string) {
  const res = await apiFetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return (await res.json()) as { token: string };
}

export async function resendVerification(email: string): Promise<void> {
  await apiFetch(
    apiUrl('/api/auth/resend-verification'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
  );
}

export async function verifyEmail(token: string): Promise<void> {
  await apiFetch(
    apiUrl('/api/auth/verify-email'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    },
  );
}

export async function forgotPassword(email: string): Promise<void> {
  await apiFetch(
    apiUrl('/api/auth/password/forgot'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
  );
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await apiFetch(
    apiUrl('/api/auth/password/reset'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    },
  );
}

export async function getUserHistory(): Promise<ImageJobApi[]> {
  const res = await fetchWithAuth(
    apiUrl('/api/history'),
  );
  return (await res.json()) as ImageJobApi[];
}

export async function getUserId(): Promise<string> {
  const res = await fetchWithAuth(
    apiUrl('/api/users'),
  );
  const id = await res.text();
  return id.replace(/^"|"$/g, '');
}

export async function getUserById(id: string): Promise<UserDto> {
  const res = await fetchWithAuth(
    apiUrl(`/api/users/${id}`),
  );
  return (await res.json()) as UserDto;
}

export async function getCredits(): Promise<number> {
  const res = await fetchWithAuth(
    apiUrl('/api/users/credits'),
  );
  const json = await res.json();
  return json.credits as number;
}

export async function updateUser(
  id: string,
  dto: Partial<UserDto>,
): Promise<UserDto> {
  const res = await fetchWithAuth(
    apiUrl(`/api/users/${id}`),
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dto),
    },
  );
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
  const cleanedPath = pathOrUrl.startsWith('/')
    ? pathOrUrl
    : `/${pathOrUrl}`;
  if (!API_BASE_URL) {
    return cleanedPath;
  }
  return `${API_BASE_URL}${cleanedPath}`;
}
