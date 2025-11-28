'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getBillingMe, type BillingMe } from '../../../lib/billing';

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessContent() {
  const params = useSearchParams();
  const _sessionId = params.get('session_id');
  const [info, setInfo] = useState<BillingMe | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getBillingMe();
        setInfo(data);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen mt-24 px-4 py-10 bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 text-gray-100 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Pagamento concluído!</h1>
      {info ? (
        <p className="mb-4 text-center">
          Plano: <span className="font-semibold text-purple-400">{info.plan}</span>
          <br />
          Status: {info.subscriptionStatus || '--'}
          <br />
          Próxima renovação:{' '}
          {info.currentPeriodEnd ? new Date(info.currentPeriodEnd).toLocaleDateString() : '--'}
        </p>
      ) : (
        <p className="mb-4">Carregando...</p>
      )}
      <Link href="/profile" className="text-purple-400 hover:underline">
        Ir para o perfil
      </Link>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen mt-24 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 text-gray-100">
      <p className="text-lg">Carregando...</p>
    </div>
  );
}

