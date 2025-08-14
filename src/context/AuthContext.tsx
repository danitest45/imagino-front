'use client';

import { createContext, useState, useEffect, ReactNode, useContext } from 'react';

interface AuthContextType {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  login: (token: string, username: string) => void;
  logout: () => void;
  setUsername: (username: string) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Carrega o token e o username do localStorage na inicialização
  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const storedUsername = typeof window !== 'undefined' ? localStorage.getItem('username') : null;
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
    }
    if (storedUsername) {
      setUsernameState(storedUsername);
    }
  }, []);

  const login = (newToken: string, newUsername: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    setToken(newToken);
    setUsernameState(newUsername);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsernameState(null);
    setIsAuthenticated(false);
  };

  const setUsername = (newUsername: string) => {
    localStorage.setItem('username', newUsername);
    setUsernameState(newUsername);
  };

  return (
    <AuthContext.Provider value={{ token, username, isAuthenticated, login, logout, setUsername }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  }
  return ctx;
}
