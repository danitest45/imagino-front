'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '../../lib/api';
import { Problem, mapProblemToUI } from '../../lib/errors';
import { Button } from '../../components/ui/StudioUI';
import { AuthShell, UnavailableAccountAction } from '../../components/account/AuthShell';
import { EmailField, PasswordField } from '../../components/account/AuthFields';
import { isAIStaging } from '../../components/account/environment';

export default function RegisterPage() {
  if (isAIStaging) return <UnavailableAccountAction title="Registration is unavailable here." description="This Preview uses existing accounts to review the creative workflow." />;
  return <RegisterForm />;
}

function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isAIStaging || pending.current) return;
    pending.current = true;
    setError('');
    setLoading(true);
    try {
      await registerUser(email, password);
      router.push('/confirm-email');
    } catch (err) {
      setError(mapProblemToUI(err as Problem).message);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return <AuthShell title="A place for your next idea." intro="Create your Imagino account.">
    {error && <p role="alert" className="account-error">{error}</p>}
    <form onSubmit={handleSubmit} className="account-form">
      <EmailField value={email} onChange={setEmail} disabled={loading} />
      <PasswordField value={password} onChange={setPassword} newPassword disabled={loading} />
      <Button type="submit" loading={loading} disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</Button>
    </form>
    <p className="account-footer-copy">Already have an account? <Link href="/login" className="account-link">Sign in</Link></p>
  </AuthShell>;
}
