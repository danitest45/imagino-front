'use client';

import { useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginUser } from '../../lib/api';
import { AuthContext } from '../../context/AuthContext';
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { Problem, mapProblemToUI } from '../../lib/errors';
import { toast } from '../../lib/toast';
import ResendVerificationDialog from '../../components/ResendVerificationDialog';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const auth = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    setError('');
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('userEmail', email);
      }
      const { token } = await loginUser(email, password);
      auth.login(token);
      router.push('/images/replicate');
    } catch (err) {
      const problem = err as Problem;
      if (problem.code === 'EMAIL_NOT_VERIFIED') {
        setEmailModal(true);
      } else {
        const action = mapProblemToUI(problem);
        setError(action.message);
        toast(action.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Redirect user to Google's consent screen
  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
    const scope = 'openid email profile';
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri || '')}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&prompt=select_account`;
    window.location.href = authUrl;
  };

  const highlights = useMemo(
    () => [
      'Access tuned imagino.AI models and exclusive preset libraries.',
      'Centralized dashboard with full creation history and version tracking.',
      'Enterprise-grade security with SSO, SAML, and granular roles.',
    ],
    [],
  );

  return (
    <>
      <div className="relative flex min-h-[100dvh] items-center justify-center px-4 py-16">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.25),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(14,165,233,0.2),_transparent_55%)]" aria-hidden />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,_rgba(15,23,42,0.92),_rgba(15,15,26,0.95))]" aria-hidden />

        <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative hidden min-h-full flex-col justify-between bg-gradient-to-br from-fuchsia-600/30 via-purple-600/20 to-cyan-500/20 p-10 lg:flex">
              <div className="space-y-4">
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100">
                  Welcome back
                </span>
                <h1 className="text-3xl font-semibold text-white">
                  Sign in to keep creating extraordinary visuals with imagino.AI.
                </h1>
                <p className="text-sm text-slate-100/80">
                  Sync projects across devices, share variations with your team, and keep your creative library organized automatically.
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
                  Tip: use your company email to enable single sign-on, two-factor authentication, and shared workspaces.
                </p>
              </div>
            </div>

          <div className="flex flex-col justify-center space-y-6 p-8 sm:p-10">
            <div>
              <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">Sign in to imagino.AI</h2>
              <p className="mt-2 text-center text-sm text-gray-400">
                  Don&apos;t have an account?{' '}
                  <Link href="/register" className="font-medium text-fuchsia-300 hover:text-fuchsia-200">
                    Create one in seconds
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
                      placeholder="you@company.com"
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
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-sm text-white placeholder:text-gray-500 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                      autoComplete="current-password"
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

                <div className="flex items-center justify-between text-sm">
                  <Link href="/forgot-password" className="font-medium text-fuchsia-300 hover:text-fuchsia-200">
                    Forgot password?
                  </Link>
                </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-950/80 px-4 text-gray-500">or continue with</span>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M23.49 12.27c0-.8-.07-1.55-.2-2.27H12v4.3h6.45c-.28 1.48-1.11 2.74-2.37 3.59v2.98h3.83c2.24-2.06 3.58-5.1 3.58-8.6z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.83-2.98c-1.05.7-2.4 1.12-4.12 1.12-3.17 0-5.86-2.14-6.82-5h-4.04v3.14C3.96 21.32 7.67 24 12 24z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.18 14.23a7.58 7.58 0 0 1-.41-2.23c0-.77.15-1.52.42-2.23V6.63H1.13A11.97 11.97 0 0 0 0 12c0 1.93.46 3.76 1.13 5.37l4.05-3.14z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 4.75c1.77 0 3.36.61 4.6 1.81l3.44-3.44C17.95 1.15 15.24 0 12 0 7.67 0 3.96 2.68 1.13 6.63l4.05 3.14C6.28 6.9 8.83 4.75 12 4.75z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      </div>
      <ResendVerificationDialog
        open={emailModal}
        email={email}
        onClose={() => setEmailModal(false)}
      />
    </>
  );
}
