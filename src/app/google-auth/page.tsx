'use client';

import { Suspense, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '../../context/AuthContext';
import { getAccessToken, refreshAccessToken } from '../../lib/auth';

export default function GoogleAuthPage() {
  return (
    <Suspense fallback={<GoogleAuthLoading />}>
      <GoogleAuthContent />
    </Suspense>
  );
}

function GoogleAuthContent() {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const login = auth?.login;

  useEffect(() => {
    if (!login) return;
    let canceled = false;
    async function finishLogin() {
      if (!getAccessToken()) await refreshAccessToken();
      if (canceled) return;
      const token = getAccessToken();
      if (token) {
        login!(token);
        router.replace('/images');
      } else {
        router.replace('/login');
      }
    }
    void finishLogin();
    return () => { canceled = true; };
  }, [login, router]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center text-white">
      <p>Autenticando com Google...</p>
    </div>
  );
}

function GoogleAuthLoading() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center text-white">
      <p>Carregando...</p>
    </div>
  );
}
