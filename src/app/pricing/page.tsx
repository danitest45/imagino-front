'use client';

import { useRef, useState } from 'react';
import { createCheckoutSession } from '../../lib/billing';
import { Button } from '../../components/ui/StudioUI';
import { CostsContent } from '../../components/account/CostsContent';
import { isAIStaging } from '../../components/account/environment';

export default function PricingPage() {
  return <div className="costs-page"><CostsContent preview={isAIStaging} />{!isAIStaging && <ExistingPlans />}</div>;
}

function ExistingPlans() {
  const [loading, setLoading] = useState<'PRO' | 'ULTRA' | null>(null);
  const [error, setError] = useState('');
  const pending = useRef(false);

  async function handleSubscribe(plan: 'PRO' | 'ULTRA') {
    if (isAIStaging || pending.current) return;
    pending.current = true;
    setLoading(plan);
    setError('');
    try { const { url } = await createCheckoutSession(plan); window.location.href = url; }
    catch { setError('Checkout could not be started. If you already have a subscription, manage it from your account.'); pending.current = false; setLoading(null); }
  }

  return <section className="costs-plans" aria-labelledby="plans-heading">
    <h2 id="plans-heading">Subscription options</h2>
    {error && <p role="alert" className="account-error">{error}</p>}
    <div className="costs-plan-grid">
      <article className="costs-plan"><h3>PRO</h3><p><strong className="costs-plan-price">US$10</strong> / month</p><p>100 credits per month</p><Button onClick={() => handleSubscribe('PRO')} loading={loading === 'PRO'} disabled={loading !== null}>Subscribe to PRO</Button></article>
      <article className="costs-plan"><h3>ULTRA</h3><p><strong className="costs-plan-price">US$20</strong> / month</p><p>300 credits per month</p><Button onClick={() => handleSubscribe('ULTRA')} loading={loading === 'ULTRA'} disabled={loading !== null}>Subscribe to ULTRA</Button></article>
    </div>
  </section>;
}
