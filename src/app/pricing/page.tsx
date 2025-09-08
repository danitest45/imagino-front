'use client';

import { useState, useMemo } from 'react';
import { createCheckoutSession } from '../../lib/billing';
import { useAuth } from '../../context/AuthContext';
import ResendVerificationModal from '../../components/ResendVerificationModal';

export default function PricingPage() {
  const [loading, setLoading] = useState<'PRO' | 'ULTRA' | null>(null);
  const [verifyModal, setVerifyModal] = useState(false);
  const { token } = useAuth();
  const email = useMemo(() => {
    if (!token) return '';
    try {
      return JSON.parse(atob(token.split('.')[1])).email || '';
    } catch {
      return '';
    }
  }, [token]);

  const handleSubscribe = async (plan: 'PRO' | 'ULTRA') => {
    try {
      setLoading(plan);
      const { url } = await createCheckoutSession(plan);
      window.location.href = url;
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_NOT_VERIFIED') {
        setVerifyModal(true);
      } else {
        console.error(err);
      }
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen mt-24 px-4 py-10 bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 text-gray-100 flex items-center justify-center">
      <div className="flex space-x-8">
        <div className="bg-gray-900/40 p-6 rounded-xl w-64 text-center">
          <h2 className="text-xl font-bold mb-2">PRO</h2>
          <p className="mb-4">US$10 / mês</p>
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            onClick={() => handleSubscribe('PRO')}
            disabled={loading !== null}
          >
            {loading === 'PRO' ? 'Carregando...' : 'Assinar PRO'}
          </button>
        </div>
        <div className="bg-gray-900/40 p-6 rounded-xl w-64 text-center">
          <h2 className="text-xl font-bold mb-2">ULTRA</h2>
          <p className="mb-4">US$20 / mês</p>
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            onClick={() => handleSubscribe('ULTRA')}
            disabled={loading !== null}
          >
            {loading === 'ULTRA' ? 'Carregando...' : 'Assinar ULTRA'}
          </button>
        </div>
      </div>
      {verifyModal && (
        <ResendVerificationModal
          email={email}
          open={verifyModal}
          onClose={() => setVerifyModal(false)}
        />
      )}
    </div>
  );
}

