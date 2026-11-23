'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ShieldCheck, UserCheck, Warehouse, ArrowRight, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const { user, login, logout, isAdmin } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoUser: string, demoPass: string) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setError(null);
    setLoading(true);

    try {
      await login(demoUser, demoPass);
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md space-y-8">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#0B7A55] text-white items-center justify-center font-bold text-2xl shadow-lg ring-4 ring-[#0B7A55]/10 mb-2">
            L
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-text">
            Sign in to Lammart
          </h1>
          <p className="text-sm text-text-muted">
            Laminate Retail POS, Inventory & Challan Management System
          </p>
        </div>

        {/* Current user card if already logged in */}
        {user && (
          <div className="bg-surface rounded-2xl p-5 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-soft text-accent flex items-center justify-center font-bold">
                  {user.displayName.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text">{user.displayName}</div>
                  <div className="text-xs text-text-muted capitalize">@{user.username} • {user.role.replace('_', ' ')}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-xs font-semibold text-danger-text hover:underline"
              >
                Sign out
              </button>
            </div>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              <span>Continue to Counter POS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Login form card */}
        <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-border shadow-sm space-y-6">
          {error && (
            <div className="p-3.5 bg-danger-soft/60 border border-danger-text/20 rounded-xl text-xs font-medium text-danger-text flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-faint">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or billing or godown"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-surface-sunken border border-border focus:border-border-strong rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-faint">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-surface-sunken border border-border focus:border-border-strong rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-border">
            <div className="text-xs font-medium text-text-muted mb-3 text-center">
              Quick 1-Click Login for Demo & Testing
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin', 'admin123')}
                className="w-full p-2.5 rounded-xl border border-border hover:border-accent/50 bg-surface-sunken/40 hover:bg-accent-soft/30 flex items-center justify-between text-left transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text group-hover:text-accent">
                      Admin / Proprietor
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Full catalog, items & parties master, reports
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-text-muted bg-surface px-2 py-0.5 rounded border border-border">
                  admin / admin123
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('billing', 'billing123')}
                className="w-full p-2.5 rounded-xl border border-border hover:border-accent/50 bg-surface-sunken/40 hover:bg-accent-soft/30 flex items-center justify-between text-left transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text group-hover:text-accent">
                      Billing Counter
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Fast POS, challan, quote & invoice entry
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-text-muted bg-surface px-2 py-0.5 rounded border border-border">
                  billing / billing123
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('godown', 'godown123')}
                className="w-full p-2.5 rounded-xl border border-border hover:border-accent/50 bg-surface-sunken/40 hover:bg-accent-soft/30 flex items-center justify-between text-left transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                    <Warehouse className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text group-hover:text-accent">
                      Godown Manager
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Stock inward, transfers & godown ledger
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-text-muted bg-surface px-2 py-0.5 rounded border border-border">
                  godown / godown123
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-text-faint">
          Protected by JWT authentication • Lammart v2.0
        </div>
      </div>
    </div>
  );
}
