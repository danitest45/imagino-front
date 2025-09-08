'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { verifyEmail, resendVerification } from '../../lib/api';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    async function run() {
      try {
        await verifyEmail(token);
        setStatus('success');
      } catch (err: unknown) {
        setErrorCode((err as Error).message);
        setStatus('error');
      }
    }
    if (token) run();
  }, [token]);

  async function handleResend() {
    setResendStatus('sending');
    try {
      await resendVerification(email);
      setResendStatus('sent');
    } finally {
      setResendStatus('sent');
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">Verificando…</div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4">
        <p>Email verificado com sucesso!</p>
        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-purple-600 rounded-md"
        >
          Ir para login
        </button>
      </div>
    );
  }

  const messages: Record<string, string> = {
    TOKEN_INVALID: 'Link inválido.',
    TOKEN_EXPIRED: 'Link expirado. Clique em Reenviar.',
    TOKEN_CONSUMED: 'Este link já foi usado.',
  };
  const msg = messages[errorCode || 'TOKEN_INVALID'];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="bg-gray-800/80 backdrop-blur-md p-8 rounded-xl shadow-2xl w-full max-w-md text-center text-white">
        <p className="mb-4">{msg}</p>
        {resendStatus === 'sent' ? (
          <p className="text-green-500 mb-4" aria-live="polite">
            Email reenviado!
          </p>
        ) : (
          <div className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Seu email"
              className="w-full px-4 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400"
            />
            <button
              onClick={handleResend}
              disabled={resendStatus === 'sending'}
              className="w-full py-2 bg-purple-600 rounded-md disabled:opacity-50"
            >
              {resendStatus === 'sending' ? 'Enviando…' : 'Reenviar'}
            </button>
          </div>
        )}
        <Link href="/login" className="block mt-4 text-purple-400 underline">
          Voltar para login
        </Link>
      </div>
    </div>
  );
}
