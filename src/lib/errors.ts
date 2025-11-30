export interface Problem {
  status: number;
  title: string;
  detail?: string | null;
  code?: string;
  traceId?: string;
  meta?: Record<string, unknown>;
}

export interface ProblemUIAction {
  kind: 'toast' | 'modal' | 'redirect';
  message: string;
  cta?: string;
}

export function mapProblemToUI(problem: Problem): ProblemUIAction {
  const code = problem.code ?? 'INTERNAL';
  const meta = problem.meta ?? {};
  switch (code) {
    case 'INSUFFICIENT_CREDITS': {
      const current = meta.current ?? meta.credits ?? 0;
      const needed = meta.needed ?? 0;
      return {
        kind: 'modal',
        message: `You do not have enough credits (${current}/${needed})`,
        cta: '/pricing',
      };
    }
    case 'FORBIDDEN_FEATURE':
      return {
        kind: 'modal',
        message: 'This feature requires a higher-tier plan',
        cta: '/pricing',
      };
    case 'VALIDATION_FAILED': {
      const fields = Array.isArray(meta.fields) ? meta.fields.join(', ') : '';
      return {
        kind: 'toast',
        message: fields ? `Invalid fields: ${fields}` : 'Invalid data',
      };
    }
    case 'RATE_LIMITED': {
      const retry = meta.retryAfter ?? meta.retry_after;
      const seconds = typeof retry === 'number' ? retry : undefined;
      return {
        kind: 'toast',
        message: seconds
          ? `Rate limit exceeded; try again in ${seconds}s`
          : 'Rate limit exceeded; try again later',
      };
    }
    case 'STRIPE_ERROR':
      return {
        kind: 'toast',
        message: problem.detail || 'Error processing payment',
      };
    case 'TOKEN_INVALID':
      return { kind: 'toast', message: 'Invalid link.' };
    case 'TOKEN_EXPIRED':
      return {
        kind: 'toast',
        message: 'Link expired. Click Resend.',
      };
    case 'TOKEN_CONSUMED':
      return {
        kind: 'toast',
        message: 'This link has already been used.',
      };
    case 'WEAK_PASSWORD':
      return {
        kind: 'toast',
        message: 'Weak password. Use 8+ characters with a number and symbol.',
      };
    case 'EMAIL_NOT_VERIFIED':
      return {
        kind: 'toast',
        message: 'Please verify your email.',
      };
    case 'INVALID_CREDENTIALS':
      return {
        kind: 'toast',
        message: 'Invalid email or password.',
      };
    case 'NETWORK_ERROR':
      return {
        kind: 'toast',
        message: 'Network error. Please try again.',
      };
    default:
      return {
        kind: 'toast',
        message: problem.traceId
          ? `Unexpected error (${problem.traceId})`
          : 'Unexpected error',
  };
}
}
