import { fetchWithAuth } from '../lib/auth';
import { apiUrl } from './config';

export interface BillingMe {
  plan?: 'PRO' | 'ULTRA' | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null; // ISO
  credits: number;
  hasPaidInvoice: boolean;
}

export async function getBillingMe(): Promise<BillingMe> {
  const res = await fetchWithAuth(apiUrl('/api/billing/me'), { credentials: 'include' });
  if (!res.ok) throw new Error('Error retrieving subscription');
  return res.json();
}

export async function createCheckoutSession(plan: 'PRO' | 'ULTRA'): Promise<{ url: string }> {
  const res = await fetchWithAuth(apiUrl('/api/billing/checkout'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error(res.status === 409 ? 'Gerencie a assinatura existente no portal. Se há outro checkout aberto, conclua ou aguarde sua expiração.' : 'Não foi possível iniciar o checkout.');
  return stripeRedirect(await res.json(), 'checkout.stripe.com');
}

export async function createPortalSession(): Promise<{ url: string }> {
  const res = await fetchWithAuth(apiUrl('/api/billing/portal'), {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Não foi possível abrir o portal de assinatura.');
  return stripeRedirect(await res.json(), 'billing.stripe.com');
}

function stripeRedirect(data: { url: string }, host: string): { url: string } {
  const url = new URL(data.url);
  if (url.protocol !== 'https:' || url.hostname !== host || url.username || url.password || url.port) {
    throw new Error('Destino de assinatura inválido.');
  }
  return data;
}

