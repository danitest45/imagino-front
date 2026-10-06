'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmail, resendVerification } from '../../lib/api';
import { Problem, mapProblemToUI } from '../../lib/errors';
import { Button } from '../../components/ui/StudioUI';
import { AuthShell, UnavailableAccountAction } from '../../components/account/AuthShell';
import { EmailField } from '../../components/account/AuthFields';
import { isAIStaging } from '../../components/account/environment';

export default function VerifyEmailPage() {
  if (isAIStaging) return <UnavailableAccountAction title="Email verification is unavailable here." description="Verification links cannot be processed in this Preview environment." />;
  return <Suspense fallback={<AuthShell title="Confirm your email"><p role="status">Verifying…</p></AuthShell>}><VerifyEmailContent /></Suspense>;
}

function VerifyEmailContent() {
  const token = useSearchParams().get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);
  const verification = useRef<{ token: string; result: Promise<void> } | null>(null);

  useEffect(() => {
    if (isAIStaging) return;
    if (!token) { setStatus('error'); setError('This link is missing its verification token. Request a new link.'); return; }
    let canceled = false;
    setStatus('loading');
    if (verification.current?.token !== token) verification.current = { token, result: verifyEmail(token) };
    verification.current.result.then(() => {
      if (!canceled) setStatus('success');
    }).catch(err => {
      if (!canceled) { setStatus('error'); setError(mapProblemToUI(err as Problem).message); }
    });
    return () => { canceled = true; };
  }, [token]);

  async function handleResend(event: React.FormEvent) {
    event.preventDefault();
    if (isAIStaging || !email || pending.current) return;
    pending.current = true;
    setLoading(true);
    setMessage('');
    try {
      await resendVerification(email);
      setMessage('Verification requested. Check your inbox.');
    } catch (err) {
      setError(mapProblemToUI(err as Problem).message);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return <AuthShell title={status === 'success' ? 'Email confirmed.' : 'Confirm your email.'}>
    {status === 'loading' && <p role="status">Verifying your email…</p>}
    {status === 'success' && <p role="status">Your email has been verified. Sign in to continue to your workspace.</p>}
    {status === 'error' && <>
      <p role="alert" className="account-error">{error}</p>
      {message && <p className="account-success" role="status">{message}</p>}
      <form className="account-form" onSubmit={handleResend}><EmailField value={email} onChange={setEmail} disabled={loading} /><Button type="submit" loading={loading} disabled={loading}>{loading ? 'Sending…' : 'Resend verification'}</Button></form>
    </>}
    <p className="account-footer-copy"><Link className="account-link" href="/login">Return to sign in</Link></p>
  </AuthShell>;
}
