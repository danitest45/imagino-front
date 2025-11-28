'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MailCheck, RefreshCw } from 'lucide-react';

import { Problem, mapProblemToUI } from '../../lib/errors';
import { resendVerification } from '../../lib/api';
import { toast } from '../../lib/toast';

export default function ConfirmEmailSentPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('userEmail');
      if (stored) setEmail(stored);
    }
  }, []);

  async function handleResend() {
    if (!email) return;
    setLoading(true);
    try {
      await resendVerification(email);
      toast('Link resent.');
    } catch (err) {
      const action = mapProblemToUI(err as Problem);
      toast(action.message);
    } finally {
      setLoading(false);
    }
  }

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
          <div className="relative hidden min-h-full flex-col justify-between bg-gradient-to-br from-fuchsia-600/30 via-purple-600/20 to-cyan-500/20 p-10 lg:flex">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100">
                Verification pending
              </span>
              <h1 className="text-3xl font-semibold text-white">Confirm your imagino.AI access</h1>
              <p className="text-sm text-slate-100/80">
                We sent a secure link to {email || 'your email'}. Click the button inside the message to activate your studio and start creating smart visual flows.
              </p>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-100/80">
              <div className="flex items-center gap-3">
                <MailCheck className="h-5 w-5 text-emerald-300" />
                <p>Check your spam or promotions folder if you can&apos;t find the email.</p>
              </div>
              <div className="flex items-center gap-3 text-slate-100/70">
                <RefreshCw className="h-5 w-5 text-cyan-300" />
                <p>Need another link? You can resend and keep your signup progress intact.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-6 p-8 sm:p-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 text-fuchsia-100">
              <MailCheck className="h-6 w-6" />
            </div>
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">Check your email</h2>
              <p className="text-sm text-gray-400">
                We sent a link to <span className="font-semibold text-white">{email || 'your email'}</span>. Open the message and click <strong>Confirm access</strong> to unlock your account.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100/80">
              <p className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold">1</span>
                Open your inbox and find the message from imagino.AI.
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-500/20 text-fuchsia-200 text-xs font-semibold">2</span>
                Click the confirmation button to activate your account.
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-200 text-xs font-semibold">3</span>
                Return to login and sign in with your credentials.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleResend}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" /> Resend verification
                  </>
                )}
              </button>
              <Link
                href="/login"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:border-white/30 hover:bg-white/5"
              >
                <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
