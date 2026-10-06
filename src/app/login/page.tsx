'use client';

import { useContext, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginUser } from '../../lib/api';
import { apiUrl } from '../../lib/config';
import { AuthContext } from '../../context/AuthContext';
import { Problem, mapProblemToUI } from '../../lib/errors';
import { Button } from '../../components/ui/StudioUI';
import { AuthShell } from '../../components/account/AuthShell';
import { EmailField, PasswordField } from '../../components/account/AuthFields';
import { isAIStaging } from '../../components/account/environment';
import ResendVerificationDialog from '../../components/ResendVerificationDialog';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailModal, setEmailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const router = useRouter();
  const auth = useContext(AuthContext);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!auth || pending.current) return;
    pending.current = true;
    setLoading(true);
    setError('');
    try {
      const { token } = await loginUser(email, password);
      auth.login(token);
      router.push(process.env.NEXT_PUBLIC_GENERATION_V2_ENABLED === 'true' ? '/create/image' : '/images');
    } catch (err) {
      const problem = err as Problem;
      if (problem.code === 'EMAIL_NOT_VERIFIED' && !isAIStaging) setEmailModal(true);
      else setError(mapProblemToUI(problem).message);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return <>
    <AuthShell title="Back to your next idea." intro="Sign in to open your studio and recent generations.">
      {error && <p role="alert" className="account-error">{error}</p>}
      <form onSubmit={handleSubmit} className="account-form">
        <EmailField value={email} onChange={setEmail} disabled={loading} />
        <PasswordField value={password} onChange={setPassword} disabled={loading} />
        {!isAIStaging && <div className="account-form-meta"><Link className="account-link" href="/forgot-password">Forgot password?</Link></div>}
        <Button type="submit" loading={loading} disabled={loading} className="account-full-width">{loading ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      {isAIStaging ? <div className="account-notice"><strong>Existing Preview accounts only</strong><p>Registration, Google sign in and password recovery are unavailable in this environment.</p></div> : <>
        <div className="account-divider">or</div>
        <Button variant="secondary" className="account-full-width" onClick={() => window.location.assign(apiUrl('/api/auth/google/login'))}>Continue with Google</Button>
        <p className="account-footer-copy">New to Imagino? <Link className="account-link" href="/register">Create an account</Link></p>
      </>}
    </AuthShell>
    <ResendVerificationDialog open={emailModal} email={email} onClose={() => setEmailModal(false)} />
  </>;
}
