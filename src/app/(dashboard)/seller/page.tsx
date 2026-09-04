'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  FileCheck2,
  CheckCircle2,
  Loader2,
  Package,
  Clock,
  Lock,
  Receipt,
} from 'lucide-react';
import { ActionInboxDashboard, DashboardTransaction } from '@/components/dashboard/action-inbox-dashboard';
import { FinancialAmount } from '@/components/ui/financial-amount';
import { formatINR } from '@/lib/utils';

function SellerDashboardContent() {
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

  const pendingUploads = txns.filter((t) =>
    ['DELIVERY_PENDING', 'VERIFICATION_FAILED'].includes(t.status)
  ).length;

  const reservedInEscrow = txns
    .filter((t) => ['FUNDS_RESERVED', 'PAYMENT_AUTHORIZED', 'DELIVERY_PENDING', 'VERIFICATION_PENDING'].includes(t.status))
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const settledPayments = txns
    .filter((t) => ['SETTLED', 'VERIFIED'].includes(t.status))
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const cards = [
    {
      label: 'Uploads Needed',
      value: String(pendingUploads),
      subtitle: pendingUploads === 0 ? 'All evidence uploaded' : 'Pending document proof',
      icon: Truck,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Locked Escrow Receivable',
      value: formatINR(reservedInEscrow),
      subtitle: 'Secured buyer deposits',
      icon: Lock,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      label: 'Settled Disbursed',
      value: formatINR(settledPayments),
      subtitle: 'Transferred to bank',
      icon: CheckCircle2,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <span>Seller Fulfillment Cockpit</span>
          <span className="rounded-full border border-violet-500/30 bg-violet-500/15 px-2.5 py-0.5 text-xs font-mono font-medium text-violet-300">
            Escrow Protected
          </span>
        </h1>
        <p className="text-sm text-zinc-500">
          Upload delivery challans, register carrier telemetry, and access trade credit advances.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
        role="SELLER"
        isLoading={loading}
        error={error}
        lastUpdated={lastUpdated}
        onRefresh={fetchTransactions}
      />
    </div>
  );
}

export default function SellerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24 text-zinc-500">
          <Loader2 className="mr-2 animate-spin" /> Loading Seller Cockpit…
        </div>
      }
    >
      <SellerDashboardContent />
    </Suspense>
  );
}