'use client';
import Link from 'next/link';

interface Props {
  open: boolean;
  current?: number;
  needed?: number;
  onClose: () => void;
}

export default function OutOfCreditsDialog({ open, current, needed, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1116] shadow-2xl shadow-purple-900/30">
        <div className="flex flex-col gap-4 px-6 py-6 sm:px-7 sm:py-7">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m0 3h.007v.008H12v-.008ZM21 12a9 9 0 11-18 0 9 9 0 0118 0Z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-white">Créditos insuficientes</h2>
              <p className="text-sm text-gray-300">
                Você precisa de mais créditos para continuar. Adquira um pacote ou faça upgrade do seu plano.
              </p>
            </div>
          </div>

          {(current !== undefined || needed !== undefined) && (
            <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-left">
              <p className="text-xs uppercase tracking-wide text-gray-400">Saldo atual</p>
              <div className="mt-1 flex items-center justify-between text-sm text-gray-200">
                <span className="font-medium">{current ?? '--'} créditos</span>
                {needed !== undefined ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                    Necessário: {needed}
                  </span>
                ) : null}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-400/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
            >
              Ver planos e comprar créditos
            </Link>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-100 transition hover:border-white/30 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
