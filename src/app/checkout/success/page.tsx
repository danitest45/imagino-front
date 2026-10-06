'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBillingMe, type BillingMe } from '../../../lib/billing';
import { AuthShell, UnavailableAccountAction } from '../../../components/account/AuthShell';
import { isAIStaging } from '../../../components/account/environment';
import { useAuth } from '../../../context/AuthContext';

export default function CheckoutSuccessPage() {
  const { token } = useAuth();
  if (isAIStaging) return <UnavailableAccountAction title="Purchases are unavailable here." description="This Preview cannot process or confirm a subscription." />;
  if (!token) return <AuthShell title="Sign in to check your subscription."><Link href="/login" className="ui-button primary">Sign in</Link></AuthShell>;
  return <CheckoutSuccessContent key={token} />;
}

function CheckoutSuccessContent() {
  const [info, setInfo] = useState<BillingMe | null>(null);
  const [checking, setChecking] = useState(true);
  const hasActiveSubscription = Boolean(info && (info.plan === 'PRO' || info.plan === 'ULTRA') && ['active', 'trialing'].includes(info.subscriptionStatus?.toLowerCase() || '') && info.hasPaidInvoice);

  useEffect(() => {
    let canceled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let finishDelay: (() => void) | undefined;
    async function load() {
      for (const wait of [0, 1000, 2000, 3000, 4000]) {
        if (wait) await new Promise<void>(resolve => { finishDelay = resolve; timer = setTimeout(resolve, wait); });
        if (canceled || isAIStaging) return;
        try {
          const data = await getBillingMe();
          if (canceled) return;
          setInfo(data);
          const active = (data.plan === 'PRO' || data.plan === 'ULTRA') && ['active', 'trialing'].includes(data.subscriptionStatus?.toLowerCase() || '') && data.hasPaidInvoice;
          if (active) { window.dispatchEvent(new Event('creditsUpdated')); setChecking(false); return; }
        } catch { /* Keep the existing bounded confirmation retry. */ }
      }
      if (!canceled) setChecking(false);
    }
    void load();
    return () => { canceled = true; clearTimeout(timer); finishDelay?.(); };
  }, []);

  return <AuthShell title={hasActiveSubscription ? 'Subscription confirmed.' : checking ? 'Checking your subscription.' : 'Confirmation is pending.'}>
    {checking && <p role="status">Waiting for payment confirmation from the API…</p>}
    {info && <dl className="account-definition"><div><dt>Plan</dt><dd>{info.plan || 'Not confirmed'}</dd></div><div><dt>Status</dt><dd>{info.subscriptionStatus || 'Not confirmed'}</dd></div><div><dt>Current period ends</dt><dd>{info.currentPeriodEnd ? new Date(info.currentPeriodEnd).toLocaleDateString('en-US') : 'Not confirmed'}</dd></div></dl>}
    {hasActiveSubscription && info && <p role="status" className="account-success">API-confirmed balance: {info.credits} credits.</p>}
    {!checking && !hasActiveSubscription && <p className="account-notice" role="status">The API has not confirmed an active paid subscription. Check your account again later.</p>}
    <div className="account-actions"><Link href="/profile" className="ui-button primary">Open account</Link></div>
  </AuthShell>;
}
