'use client';

import { useState } from 'react';
import Link from 'next/link';
import { registerUser } from '../../lib/api';
import ConfirmEmailSentPage from './confirm-email-sent';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';


export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const auth = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    try {
      await registerUser(email, password);
      setSuccess(true);
    } catch {
      setError('Failed to register');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <ConfirmEmailSentPage email={email} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-950 px-4 py-8">
      <div className="bg-gray-800/80 backdrop-blur-md p-8 rounded-xl shadow-2xl w-full max-w-md animate-fade-in transform transition-all duration-300 hover:scale-[1.02]">
        <h1 className="text-2xl font-bold text-center text-white mb-6">
          Sign up
        </h1>

        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors hover:bg-gray-600"
            required
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors hover:bg-gray-600"
            required
          />
          <button
            type="submit"
            className="w-full py-2 rounded-md bg-purple-600 text-white font-semibold transition-all duration-300 transform hover:bg-purple-700 hover:scale-105 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Enviando…' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-purple-500 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
