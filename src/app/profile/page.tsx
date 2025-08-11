'use client';

import { useState } from 'react';
import UserInfo from '../../components/profile/UserInfo';
import Billing from '../../components/profile/Billing';
import Support from '../../components/profile/Support';

const tabs = [
  { id: 'info', label: 'Informações' },
  { id: 'billing', label: 'Assinaturas' },
  { id: 'support', label: 'Suporte' },
];

export default function ProfilePage() {
  const [active, setActive] = useState('info');

  return (
    <div className="min-h-screen mt-24 px-4 md:px-0 max-w-4xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">Perfil</h1>

      <div className="flex border-b border-gray-700 mb-8 justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors duration-300 ${
              active === tab.id
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent hover:text-purple-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'info' && <UserInfo />}
      {active === 'billing' && <Billing />}
      {active === 'support' && <Support />}
    </div>
  );
}

