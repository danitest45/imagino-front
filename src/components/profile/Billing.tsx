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

  return (
    <div
      className={`${
        visible ? 'opacity-100' : 'opacity-0'
      } transition-opacity duration-300 space-y-6`}
    >
      {loading ? (
        <p className="text-sm text-gray-300">Carregando...</p>
      ) : !info?.plan ? (
        <section>
          <h2 className="text-xl font-semibold mb-2">Você está no plano Free</h2>
          <Link href="/pricing" className="text-purple-400 hover:underline">
            Ver Planos
          </Link>
        </section>
      ) : (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Plano atual: {info.plan}
            </h2>
            <p className="text-sm text-gray-300">
              Status: {info.subscriptionStatus ?? '--'}
              <br />
              Renovação:{' '}
              {info.currentPeriodEnd
                ? new Date(info.currentPeriodEnd).toLocaleDateString()
                : '--'}
            </p>
          </div>
          <button
            onClick={handleManage}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Gerenciar assinatura
          </button>
        </section>
      )}
    </div>
  );
}

