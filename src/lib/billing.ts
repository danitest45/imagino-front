import { fetchWithAuth } from '../lib/auth';

export interface BillingMe {
  plan?: 'PRO' | 'ULTRA' | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null; // ISO
}

export async function getBillingMe(): Promise<BillingMe> {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/me`, { credentials: 'include' });
  if (!res.ok) throw new Error('Erro ao obter assinatura');
  return res.json();
}

export async function createCheckoutSession(plan: 'PRO' | 'ULTRA'): Promise<{ url: string }> {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/checkout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const code = data.code as string | undefined;
    if (res.status === 403 && code) {
      throw new Error(code);
    }
    throw new Error('Erro ao criar sessão de checkout');
  }
  return res.json();
}

export async function createPortalSession(): Promise<{ url: string }> {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/portal`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Erro ao criar sessão do portal');
  return res.json();
}

