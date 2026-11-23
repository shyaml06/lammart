// -------------------------------------------------
// API Client for POS frontend
// Automatically handles authentication and JSON parsing
// -------------------------------------------------

const API_BASE = '/api/v1';

// In-memory token storage (with localStorage fallback for demo/convenience)
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lammart_token') || 'demo-token';
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lammart_token', token);
  }
}

// Ensure valid token is available
let loginPromise: Promise<string | null> | null = null;
export async function ensureToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const existing = localStorage.getItem('lammart_token');
  if (existing && existing !== 'demo-token') return existing;

  if (!loginPromise) {
    loginPromise = fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.token) {
          setAuthToken(d.token);
          return d.token;
        }
        return 'demo-token';
      })
      .catch(() => 'demo-token')
      .finally(() => {
        loginPromise = null;
      });
  }
  return loginPromise;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getAuthToken();
  if (!token || token === 'demo-token') {
    token = (await ensureToken()) || 'demo-token';
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }

  return data;
}
