'use client';
import { useEffect, useState } from 'react';
import { resendVerification } from '../../lib/api';
import { toast } from '../../lib/toast';

export default function ConfirmEmailSentPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('userEmail');
      if (stored) setEmail(stored);
    }
  }, []);

  async function handleResend() {
    if (!email) return;
    setLoading(true);
    try {
      await resendVerification(email);
      toast('Link reenviado.');
    } catch {
      toast('Não foi possível reenviar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-950 px-4 py-8">
      <div className="bg-gray-800/80 backdrop-blur-md p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Confirme seu e-mail</h1>
        <p className="text-gray-300 mb-6">Enviamos um link para {email || 'seu e-mail'}.</p>
        <button
          onClick={handleResend}
          disabled={loading}
          className="w-full py-2 rounded-md bg-purple-600 text-white font-semibold transition-all hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Reenviar verificação'}
        </button>
      </div>
    </div>
  );
}
