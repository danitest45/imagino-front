'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyEmail, resendVerification } from '../../lib/api';
import { Problem, mapProblemToUI } from '../../lib/errors';
import { toast } from '../../lib/toast';

export default function VerifyEmailPage() {
  const search = useSearchParams();
  const token = search.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loadingResend, setLoadingResend] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function run() {
      try {
        await verifyEmail(token);
        setStatus('success');
      } catch (err) {
        const problem = err as Problem;
        const action = mapProblemToUI(problem);
        setStatus('error');
        setMessage(action.message);
      }
    }
    run();
  }, [token]);

  async function handleResend() {
    if (!email) return;
    setLoadingResend(true);
    try {
      await resendVerification(email);
      toast('Link reenviado.');
    } catch (err) {
      const action = mapProblemToUI(err as Problem);
      toast(action.message);
    } finally {
      setLoadingResend(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">Verificando...</div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-950 px-4 py-8">
        <div className="bg-gray-800/80 backdrop-blur-md p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-4">E-mail verificado!</h1>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2 rounded-md bg-purple-600 text-white font-semibold transition-all hover:bg-purple-700"
          >
            Ir para login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-950 px-4 py-8">
      <div className="bg-gray-800/80 backdrop-blur-md p-8 rounded-xl shadow-2xl w-full max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold text-white">Erro ao verificar</h1>
        <p className="text-gray-300">{message}</p>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={handleResend}
          disabled={loadingResend}
          className="w-full py-2 rounded-md bg-purple-600 text-white font-semibold transition-all hover:bg-purple-700 disabled:opacity-50"
        >
          {loadingResend ? 'Enviando...' : 'Reenviar'}
        </button>
      </div>
    </div>
  );
}
