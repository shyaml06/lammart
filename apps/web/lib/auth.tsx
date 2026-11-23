'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { setAuthToken, getAuthToken } from './api';

export type UserRole = 'Admin_Owner' | 'Billing_Counter' | 'Godown_Manager';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isBilling: boolean;
  isGodown: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  quickLogin: (username: string, password: string) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user & token from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('lammart_token');
      const storedUser = localStorage.getItem('lammart_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        // Default to demo admin if first time, but allow explicit login
        const defaultAdmin: AuthUser = {
          id: 'admin-default',
          username: 'admin',
          role: 'Admin_Owner',
          displayName: 'Admin (Proprietor)',
        };
        // Auto-seed admin session for seamless first visit
        login('admin', 'admin123').catch(() => {
          setUser(defaultAdmin);
        });
      }
    } catch (e) {
      console.warn('Auth initialization error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data?.token) {
        throw new Error(data?.error || 'Invalid credentials');
      }

      const loggedUser: AuthUser = data.user;
      setToken(data.token);
      setUser(loggedUser);
      setAuthToken(data.token);
      localStorage.setItem('lammart_token', data.token);
      localStorage.setItem('lammart_user', JSON.stringify(loggedUser));

      return loggedUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setAuthToken('');
    localStorage.removeItem('lammart_token');
    localStorage.removeItem('lammart_user');
    router.push('/login');
  }, [router]);

  const quickLogin = useCallback(async (username: string, password: string) => {
    return login(username, password);
  }, [login]);

  const isAdmin = user?.role === 'Admin_Owner';
  const isBilling = user?.role === 'Billing_Counter' || isAdmin;
  const isGodown = user?.role === 'Godown_Manager' || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        isBilling,
        isGodown,
        login,
        logout,
        quickLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
