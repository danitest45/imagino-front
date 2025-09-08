'use client';

import { useState } from 'react';
import { resendVerification } from '../../lib/api';

export default function ConfirmEmailSentPage({ email }: { email: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function handleResend() {
    setStatus('sending');
    try {
      await resendVerification(email);
      setStatus('sent');
    } finally {
      setStatus('sent');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-950 px-4 py-8">
      <div className="bg-gray-800/80 backdrop-blur-md p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Confirme seu e-mail</h1>
        <p className="text-gray-300 mb-4">
          Enviamos um link de verificação para {email}.
        </p>
        {status === 'sent' && (
          <p className="text-green-500 mb-2" aria-live="polite">
            Email reenviado!
          </p>
        )}
        <button
          onClick={handleResend}
          disabled={status === 'sending'}
          className="w-full py-2 rounded-md bg-purple-600 text-white font-semibold transition-all duration-300 transform hover:bg-purple-700 disabled:opacity-50"
        >
          {status === 'sending' ? 'Enviando…' : 'Reenviar verificação'}
        </button>
      </div>
    </div>
  );
}
