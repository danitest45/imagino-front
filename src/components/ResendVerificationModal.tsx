'use client';

import { useState } from 'react';
import { resendVerification } from '../lib/api';

interface Props {
  email: string;
  open: boolean;
  onClose: () => void;
}

export default function ResendVerificationModal({ email, open, onClose }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-md p-6 w-full max-w-sm text-center">
        <h2 className="text-lg font-semibold mb-2">Confirme seu e-mail</h2>
        <p className="text-sm mb-4">Enviamos um link para {email}. Não recebeu?</p>
        {status === 'sent' && (
          <p className="text-green-600 mb-2" aria-live="polite">
            Email reenviado!
          </p>
        )}
        <div className="space-y-2">
          <button
            onClick={handleResend}
            disabled={status === 'sending'}
            className="w-full py-2 bg-purple-600 text-white rounded-md disabled:opacity-50"
          >
            {status === 'sending' ? 'Enviando…' : 'Reenviar'}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-200 rounded-md"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
