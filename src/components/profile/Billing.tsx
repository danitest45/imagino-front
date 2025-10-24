'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBillingMe, createPortalSession, type BillingMe } from '../../lib/billing';

export default function Billing() {
  const [visible, setVisible] = useState(false);
  const [info, setInfo] = useState<BillingMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setVisible(true);
    async function load() {
      try {
        const data = await getBillingMe();
        setInfo(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleManage = async () => {
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      console.error(err);
    }
  };

  const renewalDate = info?.currentPeriodEnd
    ? new Date(info.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '--';

  return (
    <div
      className={`${
        visible ? 'opacity-100' : 'opacity-0'
      } space-y-6 transition-opacity duration-300`}
    >
      {loading ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-6">
          <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
          <div className="h-8 w-48 animate-pulse rounded-full bg-white/10" />
          <div className="h-14 w-full animate-pulse rounded-2xl bg-white/5" />
        </div>
      ) : !info?.plan ? (
        <section className="relative overflow-hidden rounded-3xl border border-dashed border-fuchsia-400/50 bg-black/30 p-6 text-center shadow-inner shadow-purple-500/20 sm:text-left">
          <div className="absolute -right-14 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-gradient-to-br from-fuchsia-500/10 via-purple-500/10 to-cyan-400/10 blur-3xl" aria-hidden />
          <h2 className="text-lg font-semibold text-white sm:text-xl">You&apos;re on the Free plan</h2>
          <p className="mt-2 text-sm text-gray-300">
            Unlock higher limits, batch renders, and premium support with imagino.AI Pro tiers.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-flex items-center justify-center rounded-full border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50"
          >
            Explore plans
          </Link>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_35px_90px_-45px_rgba(59,130,246,0.45)]">
          <div className="absolute -right-20 top-0 h-48 w-48 rounded-full bg-gradient-to-br from-fuchsia-500/20 via-purple-500/20 to-cyan-400/20 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-fuchsia-100">Current plan</p>
              <h2 className="text-2xl font-semibold text-white">{info.plan}</h2>
              <div className="rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-gray-300">
                <p>Status: {info.subscriptionStatus ?? '—'}</p>
                <p>Renews on: {renewalDate}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm text-gray-300">
              <p>Invoices, usage summaries, and cancellations live in the billing portal.</p>
              <button
                onClick={handleManage}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50"
              >
                Manage subscription
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

