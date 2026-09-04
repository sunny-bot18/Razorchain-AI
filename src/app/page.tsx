'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileCheck2,
  ShieldCheck,
  Activity,
  Zap,
  Loader2,
} from 'lucide-react';

const FEATURES = [
  {
    icon: FileCheck2,
    title: 'AI Document Verification',
    description:
      'Multi-agent AI verifies invoices, delivery challans and proofs against the agreed contract with real-time confidence scoring.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Payment Settlement',
    description:
      'Funds are reserved on order and only released after autonomous verification passes — with gateway-level security checks.',
  },
  {
    icon: Activity,
    title: 'Real-time Audit Trail',
    description:
      'Every status change and agent decision is recorded to an immutable audit log across the full settlement lifecycle.',
  },
];

export default function Home() {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const handleDemo = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      const res = await fetch('/api/seed', { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        let msg = 'Failed to seed demo data';
        try {
          const err = await res.json();
          msg = err.error || msg;
        } catch {
          /* ignore parse errors */
        }
        throw new Error(msg);
      }
      router.push('/login');
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : 'Failed to seed demo data');
      setSeeding(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* background glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-purple-500/20 blur-[120px]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
          <Zap className="h-3 w-3" />
          Autonomous B2B Settlement
        </span>

        <h1 className="bg-gradient-to-r from-blue-400 via-white to-purple-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-7xl">
          RazorChain AI
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
          The trust layer for B2B commerce. Let AI agents verify supplier
          documents against your contract, and settle payments automatically —
          securely, procedurally, and auditable end-to-end.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-colors hover:bg-blue-500"
          >
            Get Started
          </Link>
          <button
            onClick={handleDemo}
            disabled={seeding}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {seeding ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Seeding demo data…
              </span>
            ) : (
              'Demo Mode'
            )}
          </button>
        </div>

        {seedError && (
          <p className="mt-4 text-sm text-red-400">
            {seedError} — try the demo credentials on the login page.
          </p>
        )}

        <div className="mt-20 grid w-full gap-6 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-left transition-colors hover:border-zinc-700"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-100">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}