'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  IndianRupee,
  FilePlus2,
  Loader2,
  Lock,
  Sparkles,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { ActionInboxDashboard, DashboardTransaction } from '@/components/dashboard/action-inbox-dashboard';
import { FinancialAmount } from '@/components/ui/financial-amount';
import { formatINR } from '@/lib/utils';

function BuyerDashboardContent() {
  const router = useRouter();
  const [txns, setTxns] = useState<DashboardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/transactions', { credentials: 'include' });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        // Clear stale data on fetch error to prevent false certainty decisions
        setTxns([]);
        throw new Error(err.error || 'Failed to load transactions');
      }
      const data = await res.json();
      setTxns(data.transactions || []);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setTxns([]);
      setError(e instanceof Error ? e.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalVolume = txns.reduce((s, t) => s + Number(t.amount || 0), 0);
  const reservedVolume = txns
    .filter((t) => ['FUNDS_RESERVED', 'PAYMENT_AUTHORIZED', 'VERIFIED', 'MANUAL_REVIEW'].includes(t.status))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const settledVolume = txns
    .filter((t) => ['SETTLED', 'VERIFIED'].includes(t.status))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const refundedTxns = txns.filter((t) => ['REFUNDED', 'CANCELLED'].includes(t.status));
  const refundedVolume = refundedTxns.reduce((s, t) => s + Number(t.amount || 0), 0);

  const actionCount = txns.filter((t) =>
    ['CREATED', 'VERIFICATION_PENDING', 'VERIFIED'].includes(t.status)
  ).length;

  const cards = [
    {
      label: 'Action Required',
      value: String(actionCount),
      subtitle: actionCount === 0 ? 'Inbox Zero' : 'Pending your action',
      icon: Clock,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Reserved in Vault',
      value: formatINR(reservedVolume),
      subtitle: 'Irrevocably locked escrow',
      icon: Lock,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      label: 'Settled Disbursed',
      value: formatINR(settledVolume),
      subtitle: 'Completed payouts',
      icon: CheckCircle2,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Refunded Orders',
      value: formatINR(refundedVolume),
      subtitle: `${refundedTxns.length} returned orders`,
      icon: RotateCcw,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
      label: 'Total Escrow TPV',
      value: formatINR(totalVolume),
      subtitle: `${txns.length} contracts`,
      icon: IndianRupee,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <span>Buyer Escrow Cockpit</span>
            <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-xs font-mono font-medium text-blue-300">
              Enterprise Nodal
            </span>
          </h1>
          <p className="text-sm text-zinc-500">
            Autonomous multi-sig settlement, AI verification, and escrow telemetry.
          </p>
        </div>
        <Link
          href="/buyer/create"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-colors hover:bg-blue-500"
        >
          <FilePlus2 className="h-4 w-4" />
          Create New Purchase Order
        </Link>
      </div>

      {/* ── Financial Certainty Metrics Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-2xl border bg-zinc-900/90 p-5 backdrop-blur shadow-lg ${c.color}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">{c.label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950/60">
                <c.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-zinc-100">{c.value}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{c.subtitle}</p>
          </div>
        ))}
      </div>

      {/* ── Action Inbox Data Table with Slide-over Drawer & Cmd+K ── */}
      <ActionInboxDashboard
        transactions={txns}
        role="BUYER"
        isLoading={loading}
        error={error}
        lastUpdated={lastUpdated}
        onRefresh={fetchTransactions}
      />
    </div>
  );
}

export default function BuyerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24 text-zinc-500">
          <Loader2 className="mr-2 animate-spin" /> Loading Buyer Cockpit…
        </div>
      }
    >
      <BuyerDashboardContent />
    </Suspense>
  );
}