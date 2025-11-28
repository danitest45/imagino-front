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
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAccessToken());

  // Attempts to refresh the token when the app loads
  useEffect(() => {
    let canceled = false;
    async function init() {
      if (!getAccessToken()) {
        const refreshed = await refreshAccessToken();
        if (refreshed && !canceled) {
          setToken(getAccessToken());
          setIsAuthenticated(true);
        }
      }
    }
    init();

    return () => {
      canceled = true;
    };
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
      {children}
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
