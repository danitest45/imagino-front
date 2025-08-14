'use client';

import { useEffect, useContext } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuthContext } from '../../context/AuthContext';

export default function GoogleAuthPage() {
  const params = useSearchParams();
  const router = useRouter();
  const auth = useContext(AuthContext);

  useEffect(() => {
    const token = params.get('token');
    const username = params.get('username');
    if (token && username && auth) {
      auth.login(token, username);
      router.push('/images/replicate');
    } else {
      router.push('/login');
    }
  }, [params, auth, router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <p>Autenticando com Google...</p>
    </div>
  );
}
