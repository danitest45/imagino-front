import { fetchWithAuth } from '../lib/auth';
import { apiUrl } from './config';

export interface BillingMe {
  plan?: 'PRO' | 'ULTRA' | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null; // ISO
}

export async function getBillingMe(): Promise<BillingMe> {
  const res = await fetchWithAuth(apiUrl('/api/billing/me'), { credentials: 'include' });
  if (!res.ok) throw new Error('Erro ao obter assinatura');
  return res.json();
}

export async function createCheckoutSession(plan: 'PRO' | 'ULTRA'): Promise<{ url: string }> {
  debugger
  const res = await fetchWithAuth(apiUrl('/api/billing/checkout'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error('Erro ao criar sessão de checkout');
  return res.json();
}

export async function createPortalSession(): Promise<{ url: string }> {
  const res = await fetchWithAuth(apiUrl('/api/billing/portal'), {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Erro ao criar sessão do portal');
  return res.json();
}

