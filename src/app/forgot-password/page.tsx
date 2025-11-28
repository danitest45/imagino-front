'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Mail, Shield } from 'lucide-react';
import { forgotPassword } from '../../lib/api';
import { Problem, mapProblemToUI } from '../../lib/errors';
import { toast } from '../../lib/toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const highlights = useMemo(
    () => [
      'Security-first workflows with role-based access and audit trails.',
      'Reset support that keeps your creative teams productive worldwide.',
      'Best-in-class encryption and compliance built into every project.',
    ],
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPassword(email);
      setSent(true);
      toast('If the email exists, we\'ll send a reset link.');
    } catch (err) {
      const problem = err as Problem;
      const action = mapProblemToUI(problem);
      setError(action.message);
      if (action.kind === 'toast') {
        toast(action.message);
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
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100">
                <Shield size={14} aria-hidden />
                Account care
              </span>
              <h1 className="text-3xl font-semibold text-white">
                Recover access to your imagino.AI workspace.
              </h1>
              <p className="text-sm text-slate-100/80">
                We guide first-time creators through a secure password reset so your ideas stay protected while you get back to producing visuals fast.
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
              <p>Tip: add backup emails in your profile settings to make multi-admin recovery instant for your studio.</p>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-6 p-8 sm:p-10">
            <div>
              <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">Forgot your password?</h2>
              <p className="mt-2 text-center text-sm text-gray-400">
                Remembered your credentials?{' '}
                <Link href="/login" className="font-medium text-fuchsia-300 hover:text-fuchsia-200">
                  Return to sign in
                </Link>
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-200">
                {error}
              </div>
            )}

            {sent ? (
              <div className="space-y-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-6 text-center text-sm text-emerald-100">
                <div className="flex items-center justify-center gap-2 text-emerald-200">
                  <CheckCircle2 aria-hidden className="h-5 w-5" />
                  <span>Check your inbox</span>
                </div>
                <p>
                  If an account exists for <span className="font-semibold text-white">{email}</span>, we sent a secure link to reset your password. Follow the instructions within 10 minutes to keep it active.
                </p>
                <div className="flex flex-col gap-3 text-xs text-slate-300">
                  <p>Didn’t receive anything? Check your spam folder or try another email.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-medium text-white transition hover:border-white/20 hover:bg-white/10"
                  >
                    Try a different email
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Email
                  </label>
                  <div className="relative">
                    <Mail
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

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Send reset link
                </button>
              </form>
            )}

            <p className="text-center text-xs text-gray-500">
              Need extra help? Visit our{' '}
              <Link href="/support" className="text-fuchsia-300 hover:text-fuchsia-200">
                support center
              </Link>{' '}
              or talk to your team administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
