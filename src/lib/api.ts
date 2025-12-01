import type { ImageJobApi, UiJob, JobDetails, LatestJob } from '../types/image-job';
import type {
  PublicImageModelSummary,
  ImageModelDetails,
  ImageModelVersionDetails,
  ImageModelVersionSummary,
  JsonSchema,
} from '../types/image-model';
import type { UserDto } from '../types/user';
import { fetchWithAuth } from './auth';
import { apiFetch, buildProblem } from './api-client';
import { apiUrl, API_BASE_URL } from './config';
import type { Problem } from './errors';

function isProblem(error: unknown): error is Problem {
  return Boolean(error)
    && typeof error === 'object'
    && error !== null
    && 'status' in error
    && 'title' in error;
}

async function ensureOkResponse(res: Response, context: string): Promise<void> {
  if (res.ok) return;
  try {
    const problem = await buildProblem(res);
    throw { ...problem, detail: problem.detail ?? `${context}: ${res.status} ${res.statusText}` } as Problem;
  } catch {
    throw new Error(`${context}: ${res.status} ${res.statusText}`);
  }
}

function rethrowWithContext(error: unknown, context: string): never {
  if (isProblem(error)) {
    throw { ...error, detail: error.detail ?? context };
  }
  const message = error instanceof Error ? error.message : String(error);
  throw {
    status: 0,
    title: context,
    detail: `${context}: ${message}`,
    code: 'NETWORK_ERROR',
  } satisfies Problem;
}


export async function createRunpodJob(
  prompt: string,
  options: { width: number; height: number },
) {
  try {
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
        skipProblem: true,
      },
    );
    await ensureOkResponse(res, 'Failed to create runpod job');
    const json = await res.json();
    return String(json.content?.jobId ?? json.jobId ?? json.id ?? '');
  } catch (error) {
    rethrowWithContext(error, 'Failed to create runpod job');
  }
}

export async function createReplicateJob(prompt: string, aspectRatio: string, quality?: number) {
  try {
    const res = await fetchWithAuth(apiUrl('/api/replicate/jobs'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        aspectRatio,
        ...(typeof quality === 'number' ? { quality } : {}),
      }),
      skipProblem: true,
    });

    await ensureOkResponse(res, 'Failed to create replicate job');
    const json = await res.json();
    return String(json.jobId ?? json.id ?? '');
  } catch (error) {
    rethrowWithContext(error, 'Failed to create replicate job');
  }
}

export async function getJobStatus(jobId: string) {
  try {
    const res = await fetchWithAuth(
      apiUrl(`/api/image/jobs/${jobId}`),
      { skipProblem: true },
    );
    await ensureOkResponse(res, 'Failed to fetch job status');
    return (await res.json());
  } catch (error) {
    rethrowWithContext(error, 'Failed to fetch job status');
  }
}

export async function createVideoJob(
  modelSlug: string,
  params: Record<string, unknown>,
): Promise<{ jobId: string; status?: string; videoUrl?: string | null }> {
  try {
    const requestInit: Parameters<typeof fetchWithAuth>[1] = {
      method: 'POST',
      skipProblem: true,
    };
    const files = Object.entries(params).filter(([, value]) => value instanceof File);

    if (files.length > 0) {
      const formData = new FormData();
      const jsonParams: Record<string, unknown> = {};

      formData.append('modelSlug', modelSlug);

      Object.entries(params).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value, value.name);
        } else {
          jsonParams[key] = value;
        }
      });

      formData.append('params', JSON.stringify(jsonParams));
      requestInit.body = formData;
    } else {
      requestInit.headers = { 'Content-Type': 'application/json' };
      requestInit.body = JSON.stringify({ modelSlug, params });
    }

    const res = await fetchWithAuth(
      apiUrl('/api/video/jobs'),
      requestInit,
    );

    await ensureOkResponse(res, 'Failed to create video job');
    const json = await res.json();
    const rawUrl = json.videoUrl ?? json.video_url;
    return {
      jobId: String(json.jobId ?? json.id ?? ''),
      status: json.status ? String(json.status) : undefined,
      videoUrl: typeof rawUrl === 'string' ? normalizeUrl(rawUrl) : null,
    };
  } catch (error) {
    rethrowWithContext(error, 'Failed to create video job');
  }
}

export async function getVideoJobStatus(jobId: string) {
  try {
    const res = await fetchWithAuth(
      apiUrl(`/api/video/jobs/${jobId}`),
      { skipProblem: true },
    );
    await ensureOkResponse(res, 'Failed to fetch video job status');
    const json = await res.json();
    const rawUrl = json.videoUrl ?? json.video_url;
    return {
      jobId: String(json.jobId ?? json.id ?? jobId),
      status: json.status ? String(json.status) : undefined,
      videoUrl: typeof rawUrl === 'string' ? normalizeUrl(rawUrl) : null,
      ...json,
    };
  } catch (error) {
    rethrowWithContext(error, 'Failed to fetch video job status');
  }
}

export async function getJobDetails(jobId: string): Promise<JobDetails> {
  try {
    const res = await fetchWithAuth(
      apiUrl(`/api/image/jobs/details/${jobId}`),
      { skipProblem: true },
    );
    await ensureOkResponse(res, 'Failed to fetch job details');
    const json = await res.json();
    return {
      imageUrl: normalizeUrl(json.imageUrl) ?? '',
      prompt: json.prompt,
      username: json.username,
      createdAt: json.createdAt,
      aspectRatio: json.aspectRatio,
    };
  } catch (error) {
    rethrowWithContext(error, 'Failed to fetch job details');
  }
}

export async function getLatestJobs(): Promise<LatestJob[]> {
  try {
    const res = await apiFetch(
      apiUrl('/api/image/jobs/latest'),
      { skipProblem: true },
    );
    await ensureOkResponse(res, 'Failed to fetch latest jobs');
    const json = (await res.json()) as Array<Record<string, unknown>>;
    return json.map(j => ({
      id: String(j.id ?? j.jobId ?? j.jobID ?? ''),
      imageUrl: normalizeUrl(String(j.imageUrl ?? j.ImageUrl ?? '')) ?? '',
      prompt: String(j.prompt ?? j.Prompt ?? ''),
      username: (j.username ?? j.Username ?? null) as string | null,
      createdAt: String(j.createdAt ?? j.CreatedAt ?? ''),
      aspectRatio: (j.aspectRatio ?? j.AspectRatio ?? null) as string | null,
    }));
  } catch (error) {
    rethrowWithContext(error, 'Failed to fetch latest jobs');
  }
}

export async function getPublicImageModels(): Promise<PublicImageModelSummary[]> {
  try {
    const res = await apiFetch(
      apiUrl('/api/image/models?visibility=public'),
      { skipProblem: true },
    );
    await ensureOkResponse(res, 'Failed to fetch public image models');
    const json = await res.json();

    if (!Array.isArray(json)) {
      return [];
    }

    return json
      .map(model => ({
        slug: String(model.slug ?? model.Slug ?? ''),
        displayName: String(model.displayName ?? model.DisplayName ?? ''),
      }))
      .filter(model => model.slug && model.displayName);
  } catch (error) {
    rethrowWithContext(error, 'Failed to fetch public image models');
  }
}

function parseJsonSchema(schema: unknown): JsonSchema | null {
  if (!schema) return null;
  if (typeof schema === 'string') {
    try {
      const parsed = JSON.parse(schema);
      return typeof parsed === 'object' && parsed !== null ? (parsed as JsonSchema) : null;
    } catch {
      return null;
    }
  }
  if (typeof schema === 'object') {
    return schema as JsonSchema;
  }
  return null;
}

function parseDefaults(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') {
    return raw as Record<string, unknown>;
  }
  return null;
}

function mapVersionSummary(version: unknown): ImageModelVersionSummary | null {
  if (!version || typeof version !== 'object') {
    return null;
  }
  const record = version as Record<string, unknown>;
  const tag = String(record.tag ?? record.versionTag ?? '');
  if (!tag) {
    return null;
  }
  const id = String(record.id ?? record.versionId ?? '');
  return {
    id,
    tag,
    displayName: record.displayName ? String(record.displayName) : undefined,
    status: record.status ? String(record.status) : undefined,
  };
}

function mapVersionDetails(
  version: unknown,
  fallback: { id?: string; tag?: string } = {},
): ImageModelVersionDetails {
  const record = (version && typeof version === 'object'
    ? (version as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const id = String(record.id ?? record.versionId ?? fallback.id ?? '');
  const tag = String(record.tag ?? record.versionTag ?? fallback.tag ?? '');
  return {
    id,
    tag,
    paramSchema: parseJsonSchema(record.paramSchema),
    defaults: parseDefaults(record.defaults),
  };
}

export async function getImageModelDetails(slug: string): Promise<ImageModelDetails> {
  const res = await apiFetch(
    apiUrl(`/api/image/models/${slug}?include=versions,defaultversion`),
  );
  if (!res.ok) {
    throw new Error('Failed to fetch model details');
  }
  const json = await res.json();
  const versionsRaw = Array.isArray(json?.versions) ? json.versions : [];
  const versions = versionsRaw
    .map(mapVersionSummary)
    .filter(
      (version: ImageModelVersionSummary | null): version is ImageModelVersionSummary =>
        !!version,
    );

  const defaultVersionTag = String(
    json?.defaultVersionTag ??
      json?.defaultVersion?.tag ??
      json?.defaultVersion ??
      versions[0]?.tag ??
      '',
  );

  if (!json?.slug && !slug) {
    throw new Error('Model slug not found');
  }

  return {
    id: json?.id ? String(json.id) : undefined,
    slug: String(json?.slug ?? slug),
    displayName: String(json?.displayName ?? json?.name ?? slug),
    capabilities: Array.isArray(json?.capabilities) ? json.capabilities.map((cap: unknown) => String(cap)) : [],
    visibility: json?.visibility ? String(json.visibility) : undefined,
    status: json?.status ? String(json.status) : undefined,
    defaultVersionTag,
    versions,
  };
}

export async function getImageModelVersionDetails(
  slug: string,
  versionTag: string,
): Promise<ImageModelVersionDetails | null> {
  const res = await apiFetch(
    apiUrl(`/api/image/models/${slug}/versions/${versionTag}`),
  );

  if (!res.ok) {
    if (res.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch version details');
  }

  const json = await res.json();
  return mapVersionDetails(json, { tag: versionTag });
}

export async function createImageJob(
  modelSlug: string,
  params: Record<string, unknown>,
  options?: { presetId?: string | null; files?: Record<string, File> },
): Promise<string> {
  try {
    const hasFiles = options?.files && Object.keys(options.files).length > 0;
    const requestInit: Parameters<typeof fetchWithAuth>[1] = { method: 'POST', skipProblem: true };

    if (hasFiles) {
      const formData = new FormData();
      formData.append('modelSlug', modelSlug);
      formData.append('presetId', options?.presetId ?? '');
      formData.append('params', JSON.stringify(params));

      Object.entries(options?.files ?? {}).forEach(([key, file]) => {
        formData.append(key, file, file.name);
      });

      requestInit.body = formData;
    } else {
      requestInit.headers = {
        'Content-Type': 'application/json',
      };
      requestInit.body = JSON.stringify({
        modelSlug,
        presetId: options?.presetId ?? null,
        params,
      });
    }

    const res = await fetchWithAuth(
      apiUrl('/api/image/jobs'),
      requestInit,
    );

    await ensureOkResponse(res, 'Failed to create image job');

    const json = await res.json();
    return String(json.jobId ?? json.id ?? '');
  } catch (error) {
    rethrowWithContext(error, 'Failed to create image job');
  }
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
  let rawStatus: string | undefined = j.status;
  if (!rawStatus && 'Status' in j && typeof (j as { Status?: unknown }).Status === 'string') {
    rawStatus = (j as { Status?: string }).Status;
  }
  const normalizedStatus = rawStatus?.toUpperCase();
  const rawUrl = (Array.isArray(j.imageUrls) && j.imageUrls.length > 0)
    ? j.imageUrls[0]
    : j.imageUrl ?? null;
  return {
    id: j.jobId || j.id,
    status: normalizedStatus === 'COMPLETED' ? 'done'
      : normalizedStatus === 'FAILED' ? 'failed'
      : 'loading',
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
