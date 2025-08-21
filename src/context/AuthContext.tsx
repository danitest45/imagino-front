'use client';

import { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { setAccessToken, getAccessToken, refreshAccessToken, logoutRequest } from '../lib/auth';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);



export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAccessToken());
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Attempts to refresh the token when the app loads
  useEffect(() => {
    async function init() {
      if (!getAccessToken()) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          setToken(getAccessToken());
          setIsAuthenticated(true);
        } else {
          router.push('/login');
        }
      }
      setLoading(false);
    }
    init();
  }, [router]);

  const login = (newToken: string) => {
    setAccessToken(newToken);
    setToken(newToken);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await logoutRequest();
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
