'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { resetPassword } from '../../lib/api';
import { Problem, mapProblemToUI } from '../../lib/errors';
import { toast } from '../../lib/toast';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const search = useSearchParams();
  const token = search.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const highlights = useMemo(
    () => [
      'Granular password policies tailored for creative enterprises.',
      'Real-time breach monitoring keeps your assets protected.',
      'Reset flows designed for hybrid teams, wherever they work.',
    ],
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      toast('Senha redefinida com sucesso');
      router.push('/login');
    } catch (err) {
      const problem = err as Problem;
      const action = mapProblemToUI(problem);
      toast(action.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.25),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(14,165,233,0.2),_transparent_55%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,_rgba(15,23,42,0.92),_rgba(15,15,26,0.95))]"
        aria-hidden
      />

      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl backdrop-blur-xl">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden min-h-full flex-col justify-between bg-gradient-to-br from-fuchsia-600/30 via-purple-600/20 to-cyan-500/20 p-10 lg:flex">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100">
                <ShieldCheck size={14} aria-hidden />
                Secure reset
              </span>
              <h1 className="text-3xl font-semibold text-white">Create your new imagino.AI password.</h1>
              <p className="text-sm text-slate-100/80">
                Refresh your credentials with peace of mind—our guided flow keeps every workspace compliant while you get back to building immersive visuals.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-slate-100/80">
              {highlights.map(highlight => (
                <li key={highlight} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-slate-200/70">
              <p>Tip: rotate passwords every 90 days and enable SSO for instant, passwordless access to imagino.AI.</p>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-6 p-8 sm:p-10">
            <div>
              <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">Nova senha</h2>
              <p className="mt-2 text-center text-sm text-gray-400">
                Prefer to revisit later?{' '}
                <Link href="/login" className="font-medium text-fuchsia-300 hover:text-fuchsia-200">
                  Voltar para entrar
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Nova senha
                </label>
                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={18}
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Crie uma senha forte"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-sm text-white placeholder:text-gray-500 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/10 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm" className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={18}
                  />
                  <input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repita sua nova senha"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-sm text-white placeholder:text-gray-500 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showConfirm}
                    onClick={() => setShowConfirm(prev => !prev)}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/10 hover:text-white"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Atualizando…' : 'Redefinir senha'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-500">
              Ao redefinir, você concorda em seguir nossa{' '}
              <Link href="/security" className="text-fuchsia-300 hover:text-fuchsia-200">
                política de segurança
              </Link>{' '}
              para manter sua equipe protegida.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordLoading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-16 text-white">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.25),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(14,165,233,0.2),_transparent_55%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,_rgba(15,23,42,0.92),_rgba(15,15,26,0.95))]"
        aria-hidden
      />
      Carregando...
    </div>
  );
}
