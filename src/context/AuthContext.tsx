'use client';

import { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { setAccessToken, getAccessToken, refreshAccessToken, logoutRequest } from '../lib/auth';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);



export function AuthProvider({ children }: { children: ReactNode }) {
  const initialToken = getAccessToken();
  const [token, setToken] = useState<string | null>(initialToken);
  const [isAuthenticated, setIsAuthenticated] = useState(!!initialToken);
  const [loading, setLoading] = useState(!!initialToken);

  // Attempts to refresh the token when the app loads
  useEffect(() => {
    const savedToken = getAccessToken();

    if (!savedToken) {
      setLoading(false);
      refreshAccessToken().then((refreshed) => {
        if (refreshed) {
          const newToken = getAccessToken();
          setToken(newToken);
          setIsAuthenticated(!!newToken);
        }
      });
      return;
    }

    async function init() {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        setToken(getAccessToken());
        setIsAuthenticated(true);
      }
      setLoading(false);
    }
    init();
  }, []);

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
      {loading ? (
        <>
          {/* Optionally render a skeleton while auth refresh is in flight */}
          {children}
        </>
      ) : (
        children
      )}
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
