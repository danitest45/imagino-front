'use client';
import { useState } from 'react';
import { resendVerification } from '../lib/api';
import { toast } from '../lib/toast';

interface Props {
  open: boolean;
  email: string | null;
  onClose: () => void;
}

export default function ResendVerificationDialog({ open, email, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  if (!open) return null;

  async function handleResend() {
    if (!email) return;
    setLoading(true);
    try {
      await resendVerification(email);
      toast('Link de verificação reenviado.');
      onClose();
    } catch {
      toast('Não foi possível reenviar o link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-gray-800 p-6 rounded-xl max-w-sm w-full text-center">
        <h2 className="text-lg font-semibold text-white mb-2">Confirme seu e-mail</h2>
        <p className="text-gray-300 text-sm mb-4">
          Enviamos um link para {email}. Não recebeu?
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleResend}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 rounded text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Reenviar'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 rounded text-white hover:bg-gray-600"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
