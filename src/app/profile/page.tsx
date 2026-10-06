'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import UserInfo from '../../components/profile/UserInfo';
import Billing from '../../components/profile/Billing';
import { useAuth } from '../../context/AuthContext';
import { getCredits } from '../../lib/api';
import { Button } from '../../components/ui/StudioUI';
import { AuthShell } from '../../components/account/AuthShell';
import { AccountSummary } from '../../components/account/AccountSummary';
import { isAIStaging } from '../../components/account/environment';

export default function ProfilePage() {
  const { token } = useAuth();
  if (!token) return <AuthShell title="Your account." intro="Sign in to see your credit balance and continue creating."><Link href="/login" className="ui-button primary">Sign in</Link></AuthShell>;
  // A changed session remounts the account, clearing private state immediately.
  return <SignedInAccount key={token} />;
}

function SignedInAccount() {
  const [active, setActive] = useState<'info' | 'billing'>('info');
  const { logout } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let canceled = false;
    let request = 0;
    async function loadCredits() {
      const current = ++request;
      setLoading(true);
      setError('');
      try {
        const balance = await getCredits();
        if (!canceled && current === request) setCredits(balance);
      } catch {
        if (!canceled && current === request) { setCredits(null); setError('Your balance could not be loaded.'); }
      } finally {
        if (!canceled && current === request) setLoading(false);
      }
    }
    void loadCredits();
    const handler = () => { void loadCredits(); };
    window.addEventListener('creditsUpdated', handler);
    return () => { canceled = true; window.removeEventListener('creditsUpdated', handler); };
  }, [retry]);

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    setLogoutError('');
    try { await logout(); }
    catch { setLogoutError('Sign out could not finish. Please try again.'); setSigningOut(false); }
  }

  return <div className="account-page">
    <header className="account-page-title"><p className="eyebrow">Your workspace</p><h1>Account</h1><p>A quick check before your next creation.</p></header>
    <AccountSummary credits={credits} loading={loading} error={error} />
    {error && <div className="account-actions"><Button variant="secondary" onClick={() => setRetry(value => value + 1)}>Retry balance</Button></div>}
    {isAIStaging ? <div className="account-notice"><strong>Preview account</strong><p>Profile editing, subscriptions and credit purchases are unavailable in this environment.</p></div> : <>
      <nav className="account-tabs" aria-label="Account sections">
        <button type="button" aria-pressed={active === 'info'} onClick={() => setActive('info')}>Profile</button>
        <button type="button" aria-pressed={active === 'billing'} onClick={() => setActive('billing')}>Billing</button>
      </nav>
      <section className="account-panel">{active === 'info' ? <UserInfo /> : <Billing />}</section>
    </>}
    {logoutError && <p className="account-error" role="alert">{logoutError}</p>}
    <div className="account-actions"><Link href="/create/image" className="ui-button primary">Open studio</Link><Link href="/library" className="ui-button secondary">Open Library</Link><Button variant="ghost" loading={signingOut} disabled={signingOut} onClick={handleLogout}>Sign out</Button></div>
  </div>;
}
