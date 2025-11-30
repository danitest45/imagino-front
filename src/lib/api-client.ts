import { Problem } from './errors';

export async function buildProblem(res: Response): Promise<Problem> {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = undefined;
  }
  const body = data as Record<string, unknown> | undefined;
  return {
    status: (body?.status as number) ?? res.status,
    title: (body?.title as string) ?? res.statusText,
    detail: body?.detail as string | undefined,
    code: (body?.code as string) ?? (body?.type as string) ?? 'INTERNAL',
    traceId: (body?.traceId as string) ?? res.headers.get('x-trace-id') ?? undefined,
    meta: (body?.meta as Record<string, unknown>) ?? (body?.errors as Record<string, unknown>) ?? undefined,
  };
}

type ApiRequestInit = RequestInit & { skipProblem?: boolean };

export async function apiFetch(input: RequestInfo | URL, init: ApiRequestInit = {}): Promise<Response> {
  const { skipProblem, ...restInit } = init;
  const res = await fetch(input, { ...restInit, credentials: 'include' });
  if (!res.ok && !skipProblem) {
    throw await buildProblem(res);
  }
  return res;
}
