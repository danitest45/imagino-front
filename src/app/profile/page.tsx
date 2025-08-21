'use client';

import { useEffect, useState } from 'react';
import UserInfo from '../../components/profile/UserInfo';
import Billing from '../../components/profile/Billing';
import Support from '../../components/profile/Support';
import { useAuth } from '../../context/AuthContext';
import { getCredits } from '../../lib/api';

const tabs = [
  { id: 'info', label: 'Info' },
  { id: 'billing', label: 'Subscriptions' },
  { id: 'support', label: 'Support' },
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
    <div className="min-h-screen mt-24 px-4 py-10 bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 text-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Profile</h1>

        <div className="relative flex justify-center items-center mb-8">
          <div className="absolute left-0 text-sm text-gray-300">
            Credits: {credits ?? '--'}
          </div>
          <div className="flex bg-gray-900/40 backdrop-blur rounded-full p-1 shadow-inner">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors duration-300 ${
                  active === tab.id
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl shadow-xl p-6">
          {active === 'info' && <UserInfo />}
          {active === 'billing' && <Billing />}
          {active === 'support' && <Support />}
        </div>
      </div>
    </div>
  );
}

