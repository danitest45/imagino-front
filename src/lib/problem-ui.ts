import type { Problem } from './errors';

export type ProblemUI =
  | { kind: 'toast'; message: string }
  | { kind: 'modal'; message: string; cta?: string }
  | { kind: 'redirect'; message: string; to: string };

export function mapProblemToUI(problem: Problem): ProblemUI {
  switch (problem.code) {
    case 'INSUFFICIENT_CREDITS':
      return {
        kind: 'modal',
        message: `Sem créditos. Saldo: ${problem.meta?.current ?? 0}, necessário: ${
          problem.meta?.needed ?? 0
        }`,
        cta: '/pricing',
      };
    case 'FORBIDDEN_FEATURE':
      return {
        kind: 'modal',
        message: `Recurso do plano ${problem.meta?.requiredPlan ?? ''}`,
        cta: '/pricing',
      };
    case 'TOKEN_INVALID':
      return { kind: 'redirect', message: 'Sua sessão expirou', to: '/login' };
    case 'TOKEN_EXPIRED':
      return { kind: 'redirect', message: 'Sua sessão expirou', to: '/login' };
    case 'VALIDATION_FAILED':
      return { kind: 'toast', message: problem.detail ?? 'Dados inválidos' };
    case 'RATE_LIMITED':
      return {
        kind: 'toast',
        message: problem.detail ?? 'Muitas requisições. Tente novamente.',
      };
    case 'GENERATION_UPSTREAM_ERROR':
    case 'STORAGE_UPLOAD_FAILED':
      return { kind: 'toast', message: 'Falha temporária do provedor. Tentaremos novamente.' };
    case 'STRIPE_ERROR':
      return { kind: 'toast', message: 'Falha de pagamento. Tente novamente ou contate o suporte.' };
    default:
      return {
        kind: 'toast',
        message: `${problem.detail ?? 'Erro inesperado'}${
          problem.traceId ? ` (código: ${problem.traceId})` : ''
        }`,
      };
  }
}
