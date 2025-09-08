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
        message: `Você não tem créditos suficientes (${current}/${needed})`,
        cta: '/pricing',
      };
    }
    case 'FORBIDDEN_FEATURE':
      return {
        kind: 'modal',
        message: 'Este recurso requer um plano superior',
        cta: '/pricing',
      };
    case 'TOKEN_EXPIRED':
      return {
        kind: 'redirect',
        message: 'Sessão expirada',
        cta: '/login',
      };
    case 'VALIDATION_FAILED': {
      const fields = Array.isArray(meta.fields) ? meta.fields.join(', ') : '';
      return {
        kind: 'toast',
        message: fields ? `Campos inválidos: ${fields}` : 'Dados inválidos',
      };
    }
    case 'RATE_LIMITED': {
      const retry = meta.retryAfter ?? meta.retry_after;
      const seconds = typeof retry === 'number' ? retry : undefined;
      return {
        kind: 'toast',
        message: seconds
          ? `Você excedeu o limite; tente novamente em ${seconds}s`
          : 'Você excedeu o limite; tente novamente mais tarde',
      };
    }
    case 'STRIPE_ERROR':
      return {
        kind: 'toast',
        message: problem.detail || 'Erro ao processar pagamento',
      };
    default:
      return {
        kind: 'toast',
        message: problem.traceId
          ? `Erro inesperado (${problem.traceId})`
          : 'Erro inesperado',
      };
  }
}
