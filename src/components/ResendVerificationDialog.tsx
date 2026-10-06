'use client';

import { useRef, useState } from 'react';
import { resendVerification } from '../lib/api';
import { Problem, mapProblemToUI } from '../lib/errors';
import { Button, Dialog } from './ui/StudioUI';
import { isAIStaging } from './account/environment';
import './account/account.css';

interface Props { open: boolean; email: string | null; onClose: () => void }

export default function ResendVerificationDialog({ open, email, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const pending = useRef(false);

  async function handleResend() {
    if (isAIStaging || !email || pending.current) return;
    pending.current = true;
    setLoading(true);
    setError('');
    setMessage('');
    try { await resendVerification(email); setMessage('Verification requested. Check your inbox.'); }
    catch (err) { setError(mapProblemToUI(err as Problem).message); }
    finally { pending.current = false; setLoading(false); }
  }

  return <Dialog open={open} onClose={onClose} title="Confirm your email">
    {isAIStaging ? <p>Verification emails are unavailable in this Preview.</p> : <p>Confirm your email before signing in. You can request another verification link.</p>}
    {error && <p role="alert" className="account-error">{error}</p>}
    {message && <p role="status" className="account-success">{message}</p>}
    <div className="account-actions">{!isAIStaging && <Button onClick={handleResend} disabled={loading || !email} loading={loading}>Resend verification</Button>}<Button variant="secondary" onClick={onClose}>Close</Button></div>
  </Dialog>;
}
