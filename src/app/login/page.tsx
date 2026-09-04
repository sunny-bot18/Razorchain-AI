'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

const DEMO_CREDENTIALS = [
  { role: 'BUYER', email: 'buyer@demo.com' },
  { role: 'SELLER', email: 'seller@demo.com' },
  { role: 'ADMIN', email: 'admin@demo.com' },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { email, password, action: mode };
      if (mode === 'register') {
        body.name = name;
        body.company = company || undefined;
      }

      const res = await fetch('/api/auth', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Authentication failed');
      }

      const data = await res.json();
      const userRole = data.user?.role?.toLowerCase() || 'buyer';
      router.push(`/${userRole}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed');
      setLoading(false);
    }
  };

  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  const handleSeedDatabase = async () => {
    setSeeding(true);
    setError(null);
    setSeedSuccess(null);
    try {
      const res = await fetch('/api/seed', { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to seed database');
      }
      const data = await res.json();
      setSeedSuccess(data.message || 'Database initialized & seeded with demo users!');
      setEmail('buyer@demo.com');
      setPassword('password123');
      if (mode === 'register') setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Database initialization failed');
    } finally {
      setSeeding(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white">
            RC
          </span>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">
              RazorChain AI
            </h1>
            <p className="text-xs text-zinc-500">
              {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-lg border border-zinc-700 bg-zinc-800 p-1 text-sm">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
                setSeedSuccess(null);
              }}
              className={`rounded-md px-3 py-1.5 font-medium capitalize transition-colors ${
                mode === m
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {m === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">
                  Name
                </label>
                <input
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">
                  Company
                </label>
                <input
                  className={inputClass}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name (optional)"
                />
              </div>
              <p className="rounded-md border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">New accounts start as Buyers. An administrator can assign Seller or Admin access after registration.</p>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Email
            </label>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Password
            </label>
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 space-y-2">
              <p>{error}</p>
              <button
                type="button"
                onClick={handleSeedDatabase}
                disabled={seeding}
                className="w-full rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 font-medium py-1.5 transition-colors border border-red-500/40"
              >
                {seeding ? 'Initializing database…' : '⚡ Initialize & Seed Fresh Database Now'}
              </button>
            </div>
          )}

          {seedSuccess && (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              ✓ {seedSuccess}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || seeding}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === 'login' ? 'Signing in…' : 'Creating account…'}
              </span>
            ) : mode === 'login' ? (
              'Sign in'
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-zinc-400">
              Demo credentials (password123):
            </p>
            <button
              type="button"
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="text-[11px] text-blue-400 hover:text-blue-300 underline disabled:opacity-50"
            >
              {seeding ? 'Seeding…' : '⚡ Auto-Seed DB'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMO_CREDENTIALS.map((c) => (
              <button
                key={c.email}
                type="button"
                onClick={() => {
                  setEmail(c.email);
                  setPassword('password123');
                  if (mode === 'register') setMode('login');
                }}
                className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] text-blue-300 transition-colors hover:bg-blue-500/20"
              >
                {c.role}: {c.email}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          <Link href="/" className="hover:text-zinc-300">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
