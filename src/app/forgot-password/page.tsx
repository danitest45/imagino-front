'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { forgotPassword } from '../../lib/api';
import { Problem, mapProblemToUI } from '../../lib/errors';
import { Button } from '../../components/ui/StudioUI';
import { AuthShell, UnavailableAccountAction } from '../../components/account/AuthShell';
import { EmailField } from '../../components/account/AuthFields';
import { isAIStaging } from '../../components/account/environment';

export default function ForgotPasswordPage() {
  if (isAIStaging) return <UnavailableAccountAction title="Password recovery is unavailable here." description="This Preview does not provide a password reset service." />;
  return <ForgotPasswordForm />;
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isAIStaging || pending.current) return;
    pending.current = true;
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(mapProblemToUI(err as Problem).message);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return <AuthShell title={sent ? 'Check your inbox.' : 'Find your way back.'} intro="Recover access to your Imagino account.">
    {error && <p role="alert" className="account-error">{error}</p>}
    {sent ? <div className="account-success" role="status"><p>If an account exists for this email, a password reset link will be sent. Follow the instructions in the message.</p><Button variant="secondary" onClick={() => setSent(false)}>Try a different email</Button></div> : <form onSubmit={handleSubmit} className="account-form">
      <EmailField value={email} onChange={setEmail} disabled={loading} />
      <Button type="submit" loading={loading} disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</Button>
    </form>}
    <p className="account-footer-copy"><Link href="/login" className="account-link">Return to sign in</Link></p>
  </AuthShell>;
}
