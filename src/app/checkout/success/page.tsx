'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
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
  const [info, setInfo] = useState<BillingMe | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const [syncWarning, setSyncWarning] = useState(false);

  const hasActiveSubscription = useMemo(() => {
    if (!info) return false;
    const planActive = info.plan === 'PRO' || info.plan === 'ULTRA';
    const normalizedStatus = info.subscriptionStatus?.toLowerCase();
    const statusActive = normalizedStatus === 'active' || normalizedStatus === 'trialing';
    return planActive && statusActive && info.hasPaidInvoice;
  }, [info]);

  useEffect(() => {
    let canceled = false;

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    async function loadBillingWithRetry() {
      const attempts = [0, 1000, 2000, 3000, 4000];
      for (const wait of attempts) {
        if (canceled) return;
        if (wait > 0) {
          setCheckingPayment(true);
          await delay(wait);
        }
        try {
          const data = await getBillingMe();
          if (canceled) return;
          setInfo(data);

          const normalizedStatus = data.subscriptionStatus?.toLowerCase() ?? '';
          const isIncomplete = normalizedStatus === '' || normalizedStatus.startsWith('incomplete');

          if (data.plan && isIncomplete) {
            continue;
          }

          const planActive = data.plan === 'PRO' || data.plan === 'ULTRA';
          const statusActive = normalizedStatus === 'active' || normalizedStatus === 'trialing';

          if (planActive && statusActive && data.hasPaidInvoice) {
            setCredits(data.credits);
            window.dispatchEvent(new Event('creditsUpdated'));
            setCheckingPayment(false);
            return;
          }
        } catch (err) {
          console.error(err);
        }
      }
      if (!canceled) {
        setCheckingPayment(false);
        setSyncWarning(true);
      }
    }

    loadBillingWithRetry();

    return () => {
      canceled = true;
    };
  }, []);

  return (
    <div className="min-h-[100dvh] mt-24 px-4 py-10 bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 text-gray-100 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">{hasActiveSubscription ? 'Assinatura confirmada' : 'Verificando assinatura'}</h1>

      {checkingPayment && (
        <p className="mb-6 text-center text-sm text-gray-300">Confirmando pagamento...</p>
      )}

      {info ? (
        <div className="mb-4 text-center space-y-2">
          <p>
            Plano: <span className="font-semibold text-purple-400">{info.plan ?? '--'}</span>
          </p>
          <p>Status: {info.subscriptionStatus || '--'}</p>
          <p>
            Próxima renovação:{' '}
            {info.currentPeriodEnd ? new Date(info.currentPeriodEnd).toLocaleDateString() : '--'}
          </p>
        </div>
      ) : (
        <p className="mb-4">Carregando assinatura...</p>
      )}

      {hasActiveSubscription && credits !== null && (
        <div className="mb-6 rounded-2xl border border-green-400/50 bg-green-500/10 px-4 py-3 text-center text-sm text-green-100">
          Saldo atual confirmado pela API: <span className="font-semibold">{credits}</span> créditos.
        </div>
      )}

      {syncWarning && !hasActiveSubscription && (
        <div className="mb-6 max-w-lg rounded-2xl border border-yellow-400/40 bg-yellow-500/10 px-4 py-3 text-center text-sm text-yellow-100">
          A API ainda não confirmou uma assinatura paga. Tente novamente em alguns segundos ou acesse o perfil.
        </div>
      )}

      <Link href="/profile" className="text-purple-400 hover:underline">
        Ir para o perfil
      </Link>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-[100dvh] mt-24 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 text-gray-100">
      <p className="text-lg">Loading...</p>
    </div>
  );
}

