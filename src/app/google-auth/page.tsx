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
    if (token && auth) {
      auth.login(token);
      router.push('/images/flux-dev');
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
