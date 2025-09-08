export type Problem = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  code?: string;
  traceId?: string;
  meta?: unknown;
};

export class AppError extends Error {
  problem: Problem;
  constructor(problem: Problem) {
    super(problem.title || problem.detail || 'Request failed');
    this.name = 'AppError';
    this.problem = problem;
  }
}
