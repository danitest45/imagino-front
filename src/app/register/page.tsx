'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { registerUser } from '../../lib/api';
import { Problem, mapProblemToUI } from '../../lib/errors';
import { toast } from '../../lib/toast';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const highlights = useMemo(
    () => [
      'Launch your first image workflows with curated starter templates.',
      'Step-by-step guidance designed for emerging creative teams.',
      'Collaborate securely with version history from day zero.',
    ],
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerUser(email, password);
      if (typeof window !== 'undefined') {
        localStorage.setItem('userEmail', email);
      }
      router.push('/confirm-email');
    } catch (err) {
      const problem = err as Problem;
      const action = mapProblemToUI(problem);
      setError(action.message);
      if (action.kind === 'toast') {
        toast(action.message, 'error');
      }
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
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100">
                New to imagino.AI
              </span>
              <h1 className="text-3xl font-semibold text-white">
                Create your studio&apos;s first intelligent visuals.
              </h1>
              <p className="text-sm text-slate-100/80">
                imagino.AI gives first-time creators the onboarding, automation, and support you need to turn ideas into shareable image systems in minutes.
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
              <p>
                Tip: Invite collaborators once you&apos;re set up to share styles, prompt libraries, and asset approvals without leaving imagino.AI.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-6 p-8 sm:p-10">
            <div>
              <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">Start your free imagino.AI account</h2>
              <p className="mt-2 text-center text-sm text-gray-400">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-fuchsia-300 hover:text-fuchsia-200">
                  Sign in
                </Link>
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    data-testid="email-icon"
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={18}
                  />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@studio.com"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    data-testid="password-icon"
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={18}
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-sm text-white placeholder:text-gray-500 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/10 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-500">
              By creating an account you agree to our{' '}
              <Link href="/terms" className="text-fuchsia-300 hover:text-fuchsia-200">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-fuchsia-300 hover:text-fuchsia-200">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
