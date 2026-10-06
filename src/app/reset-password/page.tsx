'use client';

import Link from 'next/link';
import { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '../../lib/api';
import { Problem, mapProblemToUI } from '../../lib/errors';
import { Button } from '../../components/ui/StudioUI';
import { AuthShell, UnavailableAccountAction } from '../../components/account/AuthShell';
import { PasswordField } from '../../components/account/AuthFields';
import { isAIStaging } from '../../components/account/environment';

export default function ResetPasswordPage() {
  if (isAIStaging) return <UnavailableAccountAction title="Password reset is unavailable here." description="The reset service is not enabled in this Preview." />;
  return <Suspense fallback={<AuthShell title="Reset password"><p role="status">Loading…</p></AuthShell>}><ResetPasswordContent /></Suspense>;
}

function ResetPasswordContent() {
  const search = useSearchParams();
  const token = search.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isAIStaging || pending.current || !token) return;
    if (password !== confirm) { setError('The passwords do not match.'); return; }
    pending.current = true;
    setLoading(true);
    setError('');
    try {
      await resetPassword(token, password);
      router.push('/login');
    } catch (err) {
      setError(mapProblemToUI(err as Problem).message);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return <AuthShell title="Set a new password." intro="Use your new password the next time you sign in.">
    {error && <p role="alert" className="account-error">{error}</p>}
    {!token ? <div className="account-notice"><p>This link is missing its reset token. Request a new link to continue.</p><Link href="/forgot-password" className="account-link">Request a reset link</Link></div> : <form onSubmit={handleSubmit} className="account-form">
      <PasswordField value={password} onChange={setPassword} label="New password" newPassword disabled={loading} />
      <PasswordField value={confirm} onChange={setConfirm} id="confirm" label="Confirm password" newPassword disabled={loading} />
      <Button type="submit" loading={loading} disabled={loading}>{loading ? 'Updating…' : 'Reset password'}</Button>
    </form>}
    <p className="account-footer-copy"><Link href="/login" className="account-link">Return to sign in</Link></p>
  </AuthShell>;
}
