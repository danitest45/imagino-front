'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Problem, mapProblemToUI } from '../../lib/errors';
import { resendVerification } from '../../lib/api';
import { Button } from '../../components/ui/StudioUI';
import { AuthShell, UnavailableAccountAction } from '../../components/account/AuthShell';
import { EmailField } from '../../components/account/AuthFields';
import { isAIStaging } from '../../components/account/environment';

export default function ConfirmEmailPage() {
  if (isAIStaging) return <UnavailableAccountAction title="Email verification is unavailable here." description="This Preview uses existing accounts. It does not send account verification emails." />;
  return <ConfirmEmailContent />;
}

function ConfirmEmailContent() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const pending = useRef(false);

  async function handleResend(event: React.FormEvent) {
    event.preventDefault();
    if (isAIStaging || !email || pending.current) return;
    pending.current = true;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await resendVerification(email);
      setMessage('Verification requested. Check your inbox and spam folder.');
    } catch (err) {
      setError(mapProblemToUI(err as Problem).message);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return <AuthShell title="Check your email." intro="After registering, open the verification message and follow its link to confirm your email address.">
    <p>Need another link? Enter the email you used to register.</p>
    {error && <p className="account-error" role="alert">{error}</p>}
    {message && <p className="account-success" role="status">{message}</p>}
    <form onSubmit={handleResend} className="account-form account-footer-copy">
      <EmailField value={email} onChange={setEmail} disabled={loading} />
      <Button type="submit" loading={loading} disabled={loading}>{loading ? 'Sending…' : 'Resend verification'}</Button>
    </form>
    <p className="account-footer-copy"><Link href="/login" className="account-link">Return to sign in</Link></p>
  </AuthShell>;
}
