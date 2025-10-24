'use client';

import { useEffect, useState } from 'react';
import UserInfo from '../../components/profile/UserInfo';
import Billing from '../../components/profile/Billing';
import Support from '../../components/profile/Support';
import { useAuth } from '../../context/AuthContext';
import { getCredits } from '../../lib/api';

const tabs = [
  {
    id: 'info',
    label: 'Account',
    description: 'Update your profile details and avatar.',
  },
  {
    id: 'billing',
    label: 'Billing',
    description: 'Manage plans, invoices, and receipts.',
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Contact the imagino.AI success team.',
  },
];

export default function ProfilePage() {
  const [active, setActive] = useState('info');
  const { token } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    async function loadCredits() {
      if (!token) return;
      try {
        const c = await getCredits();
        setCredits(c);
      } catch (err) {
        console.error(err);
      }
    }
    loadCredits();
  }, [token]);

  return (
    <div className="relative -mt-20 min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 px-4 pb-16 pt-32 text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80" />
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col gap-10">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 px-6 py-10 shadow-[0_50px_100px_-40px_rgba(59,130,246,0.35)] backdrop-blur-xl sm:px-10">
          <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-gradient-to-br from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-fuchsia-100">
                Profile hub
              </span>
              <h1 className="text-3xl font-semibold text-white md:text-[2.25rem] md:leading-tight">
                Manage your imagino.AI identity
              </h1>
              <p className="text-sm text-gray-300 md:text-base">
                Tune your account, billing, and support preferences without leaving the creative flow.
              </p>
            </div>
            <div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-black/50 px-6 py-5 text-left shadow-lg shadow-purple-500/20">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100">Credits available</p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-semibold text-white">{credits ?? '--'}</span>
                <span className="text-sm text-gray-400">tokens</span>
              </div>
              <p className="text-xs text-gray-400">
                Balances refresh instantly after every generation.
              </p>
            </div>
          </div>
        </header>

        <nav className="flex flex-wrap gap-3 rounded-3xl border border-white/10 bg-black/30 p-3 shadow-inner shadow-purple-500/10 backdrop-blur">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`group flex-1 min-w-[180px] rounded-2xl border px-4 py-4 text-left transition ${
                active === tab.id
                  ? 'border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/25 via-purple-500/20 to-cyan-400/20 text-white shadow-lg shadow-purple-500/30'
                  : 'border-white/10 bg-black/40 text-gray-300 hover:border-fuchsia-400/40 hover:text-white'
              }`}
            >
              <span className="block text-sm font-semibold uppercase tracking-[0.25em] text-fuchsia-100">
                {tab.label}
              </span>
              <span className="mt-2 block text-sm leading-relaxed text-gray-400 group-hover:text-gray-200">
                {tab.description}
              </span>
            </button>
          ))}
        </nav>

        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_40px_120px_-60px_rgba(168,85,247,0.45)] backdrop-blur-xl md:p-10">
          {active === 'info' && <UserInfo />}
          {active === 'billing' && <Billing />}
          {active === 'support' && <Support />}
        </section>
      </div>
    </div>
  );
}

