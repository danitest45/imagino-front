'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, ShieldCheck, Undo2 } from 'lucide-react';

import { verifyEmail, resendVerification } from '../../lib/api';
import { Problem, mapProblemToUI } from '../../lib/errors';
import { toast } from '../../lib/toast';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyLoading />}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}

function VerifyEmailPageContent() {
  const search = useSearchParams();
  const token = search.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loadingResend, setLoadingResend] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function run() {
      try {
        await verifyEmail(token);
        setStatus('success');
      } catch (err) {
        const problem = err as Problem;
        const action = mapProblemToUI(problem);
        setStatus('error');
        setMessage(action.message);
      }
    }
    run();
  }, [token]);

  async function handleResend() {
    if (!email) return;
    setLoadingResend(true);
    try {
      await resendVerification(email);
      toast('Link reenviado.');
    } catch (err) {
      const action = mapProblemToUI(err as Problem);
      toast(action.message);
    } finally {
      setLoadingResend(false);
    }
  }

  if (status === 'loading') {
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
        Verificando...
      </div>
    );
  }

  if (status === 'success') {
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

        <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl backdrop-blur-xl">
          <div className="grid items-stretch gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative hidden min-h-full flex-col justify-between bg-gradient-to-br from-emerald-500/25 via-purple-600/20 to-cyan-500/20 p-10 lg:flex">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                  <ShieldCheck className="h-4 w-4" />
                  Security enabled
                </span>
                <h1 className="text-3xl font-semibold text-white">Email verified successfully</h1>
                <p className="text-sm text-slate-100/80">
                  Congratulations! Your account is protected and ready to use. Sign in with the same email and password to access the dashboard and create smart experiences.
                </p>
              </div>
              <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-100/80">
                <p className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold">1</span>
                  Return to login using the email you just confirmed.
                </p>
                <p className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-purple-200 text-xs font-semibold">2</span>
                  Enter your password and open the dashboard to start building projects.
                </p>
                <p className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-200 text-xs font-semibold">3</span>
                  If needed, update your info in Settings &gt; Profile.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-8 p-8 sm:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/25 via-purple-500/25 to-cyan-400/25 text-emerald-100">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-3 text-center">
                <h2 className="text-2xl font-semibold text-white sm:text-3xl">All set! Verification is complete</h2>
                <p className="text-sm text-slate-200/80">
                  We confirmed your email address. You can now access imagino.AI and keep exploring creation tools.
                </p>
              </div>

              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-100/80">
                <p className="flex items-start gap-2 text-left">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold">Tip</span>
                  To follow updates and models, enable notifications inside the dashboard under “Preferences.”
                </p>
                <p className="flex items-start gap-2 text-left">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-purple-200 text-xs font-semibold">Help</span>
                  Trouble signing in? Click “Forgot password” on the login screen to reset securely.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/login')}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 via-purple-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50"
                  >
                    Go to login
                  </button>
                  <button
                    onClick={() => router.back()}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:border-white/30 hover:bg-white/5"
                  >
                    <Undo2 className="h-4 w-4 transition group-hover:-translate-x-0.5" />
                    Go back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-950 px-4 py-8">
      <div className="bg-gray-800/80 backdrop-blur-md p-8 rounded-xl shadow-2xl w-full max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold text-white">Verification error</h1>
        <p className="text-gray-300">{message}</p>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={handleResend}
          disabled={loadingResend}
          className="w-full py-2 rounded-md bg-purple-600 text-white font-semibold transition-all hover:bg-purple-700 disabled:opacity-50"
        >
          {loadingResend ? 'Sending...' : 'Resend'}
        </button>
      </div>
    </div>
  );
}

function VerifyLoading() {
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
      Verifying...
    </div>
  );
}
