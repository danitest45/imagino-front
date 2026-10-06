'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBillingMe, createPortalSession, type BillingMe } from '../../lib/billing';
import { Button } from '../ui/StudioUI';
import { isAIStaging } from '../account/environment';

export default function Billing() {
  if (isAIStaging) return <p>Billing is unavailable in this Preview.</p>;
  return <BillingContent />;
}

function BillingContent() {
  const [info, setInfo] = useState<BillingMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingPortal, setOpeningPortal] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setError('');
    getBillingMe().then(data => { if (!canceled) setInfo(data); }).catch(() => { if (!canceled) setError('Your subscription could not be loaded.'); }).finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; };
  }, [retry]);

  async function handleManage() {
    if (isAIStaging || openingPortal) return;
    setOpeningPortal(true);
    setError('');
    try { const { url } = await createPortalSession(); window.location.href = url; }
    catch { setError('The billing portal could not be opened. Please try again.'); setOpeningPortal(false); }
  }

  return <div>
    {error && <p role="alert" className="account-error">{error}</p>}
    {loading ? <p role="status">Loading subscription…</p> : !info ? <Button variant="secondary" onClick={() => setRetry(value => value + 1)}>Retry billing</Button> : !info.plan ? <><h2>No active plan</h2><p>Explore the available subscription options.</p><Link href="/pricing" className="account-inline-link">View costs and plans</Link></> : <>
      <h2>Current subscription</h2>
      <dl className="account-definition"><div><dt>Plan</dt><dd>{info.plan}</dd></div><div><dt>Status</dt><dd>{info.subscriptionStatus || 'Unavailable'}</dd></div><div><dt>Current period ends</dt><dd>{info.currentPeriodEnd ? new Date(info.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unavailable'}</dd></div></dl>
      <Button loading={openingPortal} disabled={openingPortal} onClick={handleManage}>Manage subscription</Button>
    </>}
  </div>;
}
