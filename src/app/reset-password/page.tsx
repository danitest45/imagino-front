'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { resetPassword } from '../../lib/api';
import { Problem, mapProblemToUI } from '../../lib/errors';
import { toast } from '../../lib/toast';

export default function ResetPasswordPage() {
  const search = useSearchParams();
  const token = search.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast('As senhas não coincidem');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      toast('Senha redefinida com sucesso');
      router.push('/login');
    } catch (err) {
      const problem = err as Problem;
      const action = mapProblemToUI(problem);
      toast(action.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-950 px-4 py-8">
      <div className="bg-gray-800/80 backdrop-blur-md p-8 rounded-xl shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-white mb-6">Nova senha</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Nova senha"
            className="w-full px-4 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Confirmar senha"
            className="w-full px-4 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md bg-purple-600 text-white font-semibold transition-all hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Redefinir senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
