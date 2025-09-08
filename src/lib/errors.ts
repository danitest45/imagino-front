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
    case 'TOKEN_INVALID':
      return { kind: 'toast', message: 'Link inválido.' };
    case 'TOKEN_EXPIRED':
      return {
        kind: 'toast',
        message: 'Link expirado. Clique em Reenviar.',
      };
    case 'TOKEN_CONSUMED':
      return {
        kind: 'toast',
        message: 'Este link já foi usado.',
      };
    case 'WEAK_PASSWORD':
      return {
        kind: 'toast',
        message: 'Senha fraca. Use 8+ caracteres com número e símbolo.',
      };
    case 'EMAIL_NOT_VERIFIED':
      return {
        kind: 'toast',
        message: 'Confirme seu e-mail.',
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
