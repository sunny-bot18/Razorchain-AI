'use client';

import React, { useState, useEffect, useMemo, useTransition, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Lock,
  Layers,
  FileText,
  Truck,
  Sparkles,
  Command,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  Loader2,
  AlertTriangle,
  FilePlus2,
  Eye,
  RefreshCw,
  Keyboard,
  AlertOctagon,
  Users,
  RotateCcw,
} from 'lucide-react';
import { cn, formatDate, formatINR } from '@/lib/utils';
import StatusBadge from '@/components/status-badge';
import { FinancialAmount } from '@/components/ui/financial-amount';
import { FreshnessIndicator } from '@/components/ui/freshness-indicator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { CommandPalette } from '@/components/ui/command-palette';
import { AiConfidenceCard } from '@/components/ai/ai-confidence-card';
import { ForensicBadge } from '@/components/ai/forensic-tooltip';
import { TypedConfirmationDialog } from '@/components/ui/alert-dialog';
import { InboxZeroCard } from '@/components/dashboard/inbox-zero-card';
import { OpsImpersonationBar } from '@/components/dashboard/ops-impersonation-bar';
import { RiskSignalsPanel } from '@/components/risk/risk-signals-panel';
import { RaiseDisputeModal } from '@/components/disputes/raise-dispute-modal';
import { MakerCheckerPanel } from '@/components/governance/maker-checker-panel';
import { TombstoneBadge } from '@/components/privacy/tombstone-badge';
import { maskPII } from '@/components/privacy/tombstone-mask';

export interface DashboardTransaction {
  id: string;
  transactionNumber: string;
  buyerName?: string;
  buyerCompany?: string | null;
  buyerId?: string;
  buyerIsTombstoned?: boolean;
  buyerTombstonedAt?: string | null;
  sellerName?: string;
  sellerCompany?: string | null;
  sellerId?: string;
  sellerIsTombstoned?: boolean;
  sellerTombstonedAt?: string | null;
  isTombstoned?: boolean;
  amount: number;
  status: string;
  createdAt: string;
  poNumber?: string;
  productDescription?: string;
  deliveryAddress?: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  carrierStatus?: string | null;
  isFactored?: boolean;
  requiresDualApproval?: boolean;
  firstApproverId?: string | null;
  firstApprovedAt?: string | null;
  secondApproverId?: string | null;
  secondApprovedAt?: string | null;
  autoReleaseAt?: string | null;
  verificationConfidence?: number | null;
  forensicFlags?: string[];
}

interface ActionInboxDashboardProps {
  transactions: DashboardTransaction[];
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  isLoading?: boolean;
  error?: string | null;
  lastUpdated?: Date | string | null;
  onRefresh?: () => void | Promise<void>;
  onTransactionAction?: (id: string, action: string, payload?: Record<string, unknown>) => Promise<void>;
}

export function ActionInboxDashboard({
  transactions,
  role: initialRole,
  isLoading = false,
  error,
  lastUpdated,
  onRefresh,
  onTransactionAction,
}: ActionInboxDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  // Scoped Impersonation Role State
  const [viewAsRole, setViewAsRole] = useState<'BUYER' | 'SELLER' | 'ADMIN' | null>(null);
  const effectiveRole = viewAsRole || initialRole;

  // State from URL
  const [activeTab, setActiveTab] = useState<'action_required' | 'waiting' | 'settled' | 'refunded' | 'all'>(
    (searchParams?.get('tab') as any) || 'action_required'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') || '');
  const [selectedFilterPreset, setSelectedFilterPreset] = useState<string | null>(
    searchParams?.get('preset') || null
  );

  // Command Palette & Drawer State
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<DashboardTransaction | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  // Ergonomics: Keyboard row navigation
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(0);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  // Typed Confirmation Dialog for High-Stakes Override & Disputes
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Sync state with URL params
  const updateUrlParams = (newTab: string, newQuery: string, newPreset: string | null) => {
    const params = new URLSearchParams();
    if (newTab && newTab !== 'action_required') params.set('tab', newTab);
    if (newQuery) params.set('q', newQuery);
    if (newPreset) params.set('preset', newPreset);
    const queryString = params.toString();
    startTransition(() => {
      router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
    });
  };

  const handleTabChange = (tab: 'action_required' | 'waiting' | 'settled' | 'refunded' | 'all') => {
    setActiveTab(tab);
    setFocusedRowIndex(0);
    updateUrlParams(tab, searchQuery, selectedFilterPreset);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    updateUrlParams(activeTab, q, selectedFilterPreset);
  };

  const handlePresetSelect = (preset: string | null) => {
    const next = selectedFilterPreset === preset ? null : preset;
    setSelectedFilterPreset(next);
    updateUrlParams(activeTab, searchQuery, next);
  };

  // Classify transactions into Action Required vs Waiting vs Settled vs Refunded
  const { actionRequiredList, waitingList, settledList, refundedList } = useMemo(() => {
    const actionRequired: DashboardTransaction[] = [];
    const waiting: DashboardTransaction[] = [];
    const settled: DashboardTransaction[] = [];
    const refunded: DashboardTransaction[] = [];

    transactions.forEach((tx) => {
      const s = tx.status;
      if (['REFUNDED', 'CANCELLED'].includes(s)) {
        refunded.push(tx);
        return;
      }
      if (s === 'SETTLED') {
        settled.push(tx);
        return;
      }

      if (effectiveRole === 'BUYER') {
        if (['CREATED', 'VERIFICATION_PENDING', 'VERIFIED', 'IN_TRANSIT_UNVERIFIED'].includes(s)) {
          actionRequired.push(tx);
        } else {
          waiting.push(tx);
        }
      } else if (effectiveRole === 'SELLER') {
        if (['DELIVERY_PENDING', 'VERIFICATION_FAILED'].includes(s)) {
          actionRequired.push(tx);
        } else {
          waiting.push(tx);
        }
      } else if (effectiveRole === 'ADMIN') {
        if (['MANUAL_REVIEW', 'VERIFICATION_FAILED', 'DISPUTED', 'AWAITING_MANUAL_TRIAGE', 'SETTLEMENT_QUEUED'].includes(s)) {
          actionRequired.push(tx);
        } else {
          waiting.push(tx);
        }
      }
    });

    return {
      actionRequiredList: actionRequired,
      waitingList: waiting,
      settledList: settled,
      refundedList: refunded,
    };
  }, [transactions, effectiveRole]);

  // Current tab transactions
  const tabTransactions = useMemo(() => {
    if (activeTab === 'action_required') return actionRequiredList;
    if (activeTab === 'waiting') return waitingList;
    if (activeTab === 'settled') return settledList;
    if (activeTab === 'refunded') return refundedList;
    return transactions;
  }, [activeTab, actionRequiredList, waitingList, settledList, refundedList, transactions]);

  // Apply search query and preset filters
  const displayedTransactions = useMemo(() => {
    return tabTransactions.filter((tx) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          tx.transactionNumber.toLowerCase().includes(q) ||
          (tx.poNumber && tx.poNumber.toLowerCase().includes(q)) ||
          (tx.buyerName && tx.buyerName.toLowerCase().includes(q)) ||
          (tx.buyerCompany && tx.buyerCompany.toLowerCase().includes(q)) ||
          (tx.sellerName && tx.sellerName.toLowerCase().includes(q)) ||
          (tx.sellerCompany && tx.sellerCompany.toLowerCase().includes(q)) ||
          (tx.productDescription && tx.productDescription.toLowerCase().includes(q)) ||
          tx.status.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (selectedFilterPreset === 'aegis_flagged') {
        return tx.status === 'VERIFICATION_FAILED' || (tx.forensicFlags && tx.forensicFlags.length > 0);
      }
      if (selectedFilterPreset === 'high_value') {
        return tx.amount >= 1_000_000 || tx.requiresDualApproval;
      }
      if (selectedFilterPreset === 'reserved') {
        return ['FUNDS_RESERVED', 'PAYMENT_AUTHORIZED', 'VERIFIED', 'MANUAL_REVIEW'].includes(tx.status);
      }
      if (selectedFilterPreset === 'awaiting_triage') {
        return tx.status === 'AWAITING_MANUAL_TRIAGE';
      }
      if (selectedFilterPreset === 'queued_batch') {
        return tx.status === 'SETTLEMENT_QUEUED';
      }
      if (selectedFilterPreset === 'refunded') {
        return ['REFUNDED', 'CANCELLED'].includes(tx.status);
      }
      return true;
    });
  }, [tabTransactions, searchQuery, selectedFilterPreset]);

  // Fetch drawer details
  const openDrawer = async (tx: DashboardTransaction) => {
    setSelectedTxnId(tx.id);
    setDrawerData(tx);
    setDrawerLoading(true);
    setLiveAnnouncement(`Opened transaction preview for ${tx.transactionNumber}`);
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDrawerData({
          ...tx,
          ...data.transaction,
          verificationConfidence: data.verificationResult?.confidence,
          forensicFlags: data.securityCheck?.flags || [],
        });
      }
    } catch {
      // Keep basic data if fetch fails
    } finally {
      setDrawerLoading(false);
    }
  };

  // Keyboard navigation for long-session ops ergonomics (J/K to move, Enter/Space to open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedRowIndex((prev) => Math.min(displayedTransactions.length - 1, prev + 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedRowIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (!selectedTxnId && displayedTransactions[focusedRowIndex]) {
          e.preventDefault();
          void openDrawer(displayedTransactions[focusedRowIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedTransactions, focusedRowIndex, selectedTxnId]);

  const handleDrawerAction = async (action: string, payload?: Record<string, unknown>) => {
    if (!selectedTxnId) return;
    setActing(action);
    setLiveAnnouncement(`Executing ${action} on escrow...`);
    try {
      if (onTransactionAction) {
        await onTransactionAction(selectedTxnId, action, payload);
      } else {
        await fetch(`/api/transactions/${selectedTxnId}/${action}`, {
          method: 'POST',
          credentials: 'include',
          headers: payload ? { 'Content-Type': 'application/json' } : undefined,
          body: payload ? JSON.stringify(payload) : undefined,
        });
      }
      setLiveAnnouncement(`Escrow ${action} completed successfully.`);
      if (onRefresh) await onRefresh();
      if (drawerData) await openDrawer(drawerData);
    } catch (e) {
      setLiveAnnouncement(`Escrow ${action} failed.`);
    } finally {
      setActing(null);
    }
  };

  const detailUrl = (id: string) => {
    if (effectiveRole === 'SELLER') return `/seller/transaction/${id}`;
    if (effectiveRole === 'ADMIN') return `/admin/transaction/${id}`;
    return `/buyer/transaction/${id}`;
  };

  return (
    <div className="space-y-6">
      {/* ── ARIA-Live Consequential Announcement Region for Accessibility ── */}
      <div aria-live="assertive" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* ── Scoped Impersonation Switcher Bar for Admin/Ops ── */}
      <OpsImpersonationBar
        currentRole={initialRole}
        viewAsRole={viewAsRole}
        onSelectViewAs={(r) => {
          setViewAsRole(r);
          setLiveAnnouncement(r ? `Switched view-as perspective to ${r}` : 'Reset to default admin perspective');
        }}
      />

      {/* ── Top Bar: Search, Cmd+K trigger & Presets ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search escrows, PO #, parties, amount…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-24 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
            />
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Command className="h-3 w-3" />
              <span>K</span>
            </button>
          </div>

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-blue-400" />
            <span>Power Filter</span>
          </button>
        </div>

        {/* Freshness Telemetry */}
        <FreshnessIndicator
          lastUpdated={lastUpdated}
          isSyncing={isLoading}
          syncLabel="Syncing Escrow Vault…"
          onRefresh={onRefresh}
        />
      </div>

      {/* ── Saved View Filter Presets & Ergonomics Hint ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Saved Views:
          </span>
          <button
            onClick={() => handlePresetSelect('aegis_flagged')}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
              selectedFilterPreset === 'aegis_flagged'
                ? 'border-red-500/50 bg-red-500/15 text-red-300'
                : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            )}
          >
            🚨 Blocked by Aegis
          </button>
          <button
            onClick={() => handlePresetSelect('high_value')}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
              selectedFilterPreset === 'high_value'
                ? 'border-violet-500/50 bg-violet-500/15 text-violet-300'
                : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            )}
          >
            💎 High-Value (≥ ₹10L)
          </button>
          <button
            onClick={() => handlePresetSelect('reserved')}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
              selectedFilterPreset === 'reserved'
                ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300'
                : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            )}
          >
            🔒 Active Vault Locks
          </button>
          {effectiveRole === 'ADMIN' && (
            <>
              <button
                onClick={() => handlePresetSelect('awaiting_triage')}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                  selectedFilterPreset === 'awaiting_triage'
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                )}
              >
                👁️ Manual Triage
              </button>
              <button
                onClick={() => handlePresetSelect('queued_batch')}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                  selectedFilterPreset === 'queued_batch'
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                )}
              >
                📦 Batch Queue
              </button>
            </>
          )}
          <button
            onClick={() => handlePresetSelect('refunded')}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
              selectedFilterPreset === 'refunded'
                ? 'border-rose-500/50 bg-rose-500/15 text-rose-300'
                : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            )}
          >
            ↩ Refunded ({refundedList.length})
          </button>
          {selectedFilterPreset && (
            <button
              onClick={() => handlePresetSelect(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 ml-1"
            >
              Reset view
            </button>
          )}
        </div>

        {/* Keyboard Ergonomics Badge for Ops Analysts */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
          <Keyboard className="h-3.5 w-3.5 text-zinc-400" />
          <span>Shortcuts:</span>
          <kbd className="rounded bg-zinc-800 px-1 py-0.5 text-[10px]">J</kbd>
          <kbd className="rounded bg-zinc-800 px-1 py-0.5 text-[10px]">K</kbd>
          <span>navigate</span>
          <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px]">↵</kbd>
          <span>preview</span>
        </div>
      </div>

      {/* ── Action Tabs (Inbox Zero Split) ── */}
      <div className="flex border-b border-zinc-800 gap-6">
        <button
          onClick={() => handleTabChange('action_required')}
          className={cn(
            'relative pb-3 text-sm font-semibold transition-colors flex items-center gap-2',
            activeTab === 'action_required'
              ? 'text-blue-400'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          <span>⚡ Requires Your Action</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-mono font-bold',
              actionRequiredList.length > 0
                ? 'bg-blue-600 text-white animate-pulse'
                : 'bg-zinc-800 text-zinc-500'
            )}
          >
            {actionRequiredList.length}
          </span>
          {activeTab === 'action_required' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => handleTabChange('waiting')}
          className={cn(
            'relative pb-3 text-sm font-semibold transition-colors flex items-center gap-2',
            activeTab === 'waiting'
              ? 'text-blue-400'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          <span>⏳ Waiting on Others</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-400">
            {waitingList.length}
          </span>
          {activeTab === 'waiting' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => handleTabChange('settled')}
          className={cn(
            'relative pb-3 text-sm font-semibold transition-colors flex items-center gap-2',
            activeTab === 'settled'
              ? 'text-blue-400'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          <span>✓ Settled Payouts</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-400">
            {settledList.length}
          </span>
          {activeTab === 'settled' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => handleTabChange('refunded')}
          className={cn(
            'relative pb-3 text-sm font-semibold transition-colors flex items-center gap-2',
            activeTab === 'refunded'
              ? 'text-rose-400'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          <span>↩ Refunded Orders</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-mono font-bold',
              refundedList.length > 0
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-zinc-800 text-zinc-500'
            )}
          >
            {refundedList.length}
          </span>
          {activeTab === 'refunded' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => handleTabChange('all')}
          className={cn(
            'relative pb-3 text-sm font-semibold transition-colors flex items-center gap-2',
            activeTab === 'all'
              ? 'text-blue-400'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          <span>All ({transactions.length})</span>
          {activeTab === 'all' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>
      </div>

      {/* ── Table Container ── */}
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
          <p className="font-semibold">Failed to fetch transactions:</p>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      ) : displayedTransactions.length === 0 ? (
        activeTab === 'action_required' ? (
          <InboxZeroCard
            role={effectiveRole}
            totalManagedCount={transactions.length}
            onExploreAll={() => handleTabChange('all')}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl p-12 text-center">
            <FileText className="h-10 w-10 text-zinc-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-300">No transactions match the selected filters</p>
            <p className="text-xs text-zinc-500 mt-1">Try resetting your search query or saved views.</p>
          </div>
        )
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm" role="grid">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-950/40">
                  <th className="px-5 py-3.5">Transaction</th>
                  <th className="px-5 py-3.5">Parties</th>
                  <th className="px-5 py-3.5">Escrow Amount</th>
                  <th className="px-5 py-3.5">Status & Forensics</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Quick Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {displayedTransactions.map((tx, idx) => {
                  const hasForensicAlert = tx.status === 'VERIFICATION_FAILED' || (tx.forensicFlags && tx.forensicFlags.length > 0);
                  const isKeyboardFocused = idx === focusedRowIndex;
                  const isDualApproval = tx.amount >= 1_000_000 || tx.requiresDualApproval;

                  const isCounterPartyTombstoned = effectiveRole === 'BUYER' ? Boolean(tx.sellerIsTombstoned) : Boolean(tx.buyerIsTombstoned);
                  const rawParty = effectiveRole === 'BUYER'
                    ? (tx.sellerCompany || (tx.sellerName === 'Demo Seller' ? 'Apex Precision Engineering Ltd' : tx.sellerName) || 'Seller Corp')
                    : (tx.buyerCompany || (tx.buyerName === 'Demo Buyer' ? 'Acme Manufacturing Corp' : tx.buyerName) || 'Acme Manufacturing Corp');
                  const displayParty = isCounterPartyTombstoned ? maskPII(rawParty, 'name') : rawParty;

                  return (
                    <tr
                      key={tx.id}
                      tabIndex={0}
                      className={cn(
                        'group cursor-pointer transition-colors hover:bg-zinc-800/50 outline-none',
                        isKeyboardFocused && 'bg-zinc-800/70 ring-1 ring-inset ring-blue-500/80',
                        hasForensicAlert && 'bg-red-950/10'
                      )}
                      onClick={() => openDrawer(tx)}
                      onFocus={() => setFocusedRowIndex(idx)}
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-blue-400 group-hover:text-blue-300 flex items-center gap-1.5">
                          <span>{tx.transactionNumber}</span>
                          {tx.poNumber && (
                            <span className="text-[10px] font-mono text-zinc-500 font-normal">
                              ({tx.poNumber})
                            </span>
                          )}
                        </div>
                        {tx.productDescription && (
                          <p className="text-xs text-zinc-400 truncate max-w-xs mt-0.5">
                            {tx.productDescription}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs">
                        <div className="text-zinc-200 font-medium flex items-center gap-1.5">
                          <span className="truncate max-w-[160px]">{displayParty}</span>
                          {(isCounterPartyTombstoned || displayParty.includes('REDACTED')) && (
                            <TombstoneBadge variant="inline" tombstonedAt={effectiveRole === 'BUYER' ? tx.sellerTombstonedAt : tx.buyerTombstonedAt} />
                          )}
                        </div>
                        <div className="text-zinc-500 text-[11px] mt-0.5">
                          {effectiveRole === 'BUYER' ? 'Seller' : 'Buyer'}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs font-medium">
                        <FinancialAmount
                          amount={tx.amount}
                          status={tx.status}
                          showBadge
                        />
                        {isDualApproval && (
                          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-indigo-400 mt-1">
                            <Users className="h-3 w-3" /> Four-Eyes Multi-Sig
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={tx.status} />
                          {tx.status === 'REFUNDED' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-400">
                              <RotateCcw className="h-3 w-3" /> Escrow Returned
                            </span>
                          )}
                          {hasForensicAlert && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-red-400">
                              <ShieldAlert className="h-3 w-3" /> Aegis Flagged
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-zinc-500">
                        {formatDate(tx.createdAt)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(tx);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5 text-blue-400" />
                          <span>Preview</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Slide-Over Action Drawer (<Sheet>) ── */}
      <Sheet open={selectedTxnId !== null} onOpenChange={(open) => !open && setSelectedTxnId(null)}>
        <SheetContent side="right" className="space-y-6">
          {drawerData && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SheetTitle>{drawerData.transactionNumber}</SheetTitle>
                    <StatusBadge status={drawerData.status} />
                  </div>
                  <Link
                    href={detailUrl(drawerData.id)}
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <span>Full Workspace</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <SheetDescription>
                  {drawerData.productDescription || 'Escrow purchase order'} · Created {formatDate(drawerData.createdAt)}
                </SheetDescription>
              </SheetHeader>

              {/* Financial State Summary */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Escrow Allocation:</span>
                  <FinancialAmount
                    amount={drawerData.amount}
                    status={drawerData.status}
                    showBadge
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-zinc-800 pt-2 text-zinc-300">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-500 block">Buyer</span>
                      {drawerData.buyerIsTombstoned && (
                        <TombstoneBadge variant="compact" />
                      )}
                    </div>
                    <span>{drawerData.buyerIsTombstoned ? maskPII(drawerData.buyerCompany || drawerData.buyerName, 'name') : (drawerData.buyerCompany || (drawerData.buyerName === 'Demo Buyer' ? 'Acme Manufacturing Corp' : drawerData.buyerName) || 'Acme Manufacturing Corp')}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-500 block">Seller</span>
                      {drawerData.sellerIsTombstoned && (
                        <TombstoneBadge variant="compact" />
                      )}
                    </div>
                    <span>{drawerData.sellerIsTombstoned ? maskPII(drawerData.sellerCompany || drawerData.sellerName, 'name') : (drawerData.sellerCompany || (drawerData.sellerName === 'Demo Seller' ? 'Apex Precision Engineering Ltd' : drawerData.sellerName) || 'Apex Precision Engineering Ltd')}</span>
                  </div>
                </div>
              </div>

              {/* Top AI Confidence Card inside Drawer */}
              <AiConfidenceCard
                confidence={
                  drawerData.verificationConfidence != null
                    ? drawerData.verificationConfidence
                    : drawerData.status === 'VERIFIED'
                    ? 0.98
                    : drawerData.status === 'VERIFICATION_FAILED'
                    ? 0.65
                    : null
                }
                status={drawerData.status}
                failedChecks={
                  drawerData.status === 'VERIFICATION_FAILED'
                    ? (drawerData.forensicFlags && drawerData.forensicFlags.length > 0 ? [] : ['po_number_match'])
                    : []
                }
                securityFlags={drawerData.forensicFlags || []}
              />

              {/* Four-Eyes Governance inside Drawer for High-Value */}
              <MakerCheckerPanel
                transactionId={drawerData.id}
                amount={drawerData.amount}
                requiresDualApproval={drawerData.requiresDualApproval}
                firstApproverId={drawerData.firstApproverId}
                firstApprovedAt={drawerData.firstApprovedAt}
                secondApproverId={drawerData.secondApproverId}
                secondApprovedAt={drawerData.secondApprovedAt}
                buyerName={drawerData.buyerName}
                sellerName={drawerData.sellerName}
                status={drawerData.status}
                onApproveSignature={async (step) => {
                  setActing('execute');
                  try {
                    const res = await fetch(`/api/transactions/${drawerData.id}/multisig`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ step }),
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.error || 'Signature failed');
                    if (onRefresh) await onRefresh();
                    await openDrawer(drawerData);
                  } catch (err) {
                    console.error('Drawer multisig error:', err);
                  } finally {
                    setActing(null);
                  }
                }}
                isLoading={acting === 'execute'}
              />

              {/* Multi-Dimensional Risk Signals Panel */}
              <RiskSignalsPanel
                transactionAmount={drawerData.amount}
                status={drawerData.status}
                deliveryAddress={drawerData.deliveryAddress}
                forensicFlags={drawerData.forensicFlags}
                isFactored={drawerData.isFactored}
                requiresDualApproval={drawerData.requiresDualApproval}
                firstApproverId={drawerData.firstApproverId}
                secondApproverId={drawerData.secondApproverId}
                carrierStatus={drawerData.carrierStatus}
                compact
              />

              {/* Quick Actions Panel based on role & status */}
              <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Instant Table Actions
                </h4>

                {effectiveRole === 'BUYER' && drawerData.status === 'CREATED' && (() => {
                  const isHighValue = drawerData.amount >= 1_000_000 || drawerData.requiresDualApproval;
                  const isMultiSigGated = isHighValue && (!drawerData.firstApproverId || !drawerData.secondApproverId);

                  return (
                    <div className="space-y-1.5">
                      <button
                        disabled={acting !== null || viewAsRole !== null || isMultiSigGated}
                        onClick={() => handleDrawerAction('reserve')}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {acting === 'reserve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                        {isMultiSigGated ? 'Awaiting 2/2 Multi-Sig Signatures to Reserve' : `Lock & Reserve Escrow (${formatINR(drawerData.amount)})`}
                      </button>
                      {isMultiSigGated && (
                        <p className="text-[11px] text-amber-400 text-center font-medium">
                          High-value transactions (≥ ₹10L) require Buyer & Seller signatures above before escrow funding.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {effectiveRole === 'BUYER' && drawerData.status === 'VERIFICATION_PENDING' && (
                  <button
                    disabled={acting !== null || viewAsRole !== null}
                    onClick={() => handleDrawerAction('verify')}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50 transition-colors"
                  >
                    {acting === 'verify' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Run AI Verification Engine
                  </button>
                )}

                {effectiveRole === 'BUYER' && drawerData.status === 'VERIFIED' && (
                  <button
                    disabled={acting !== null || viewAsRole !== null}
                    onClick={() => handleDrawerAction('execute')}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    {acting === 'execute' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Release Escrow Payout ({formatINR(drawerData.amount)})
                  </button>
                )}

                {effectiveRole === 'BUYER' && ['VERIFICATION_PENDING', 'VERIFIED', 'MANUAL_REVIEW', 'VERIFICATION_FAILED'].includes(drawerData.status) && (
                  <button
                    disabled={acting !== null || viewAsRole !== null}
                    onClick={() => setDisputeModalOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors"
                  >
                    <AlertOctagon className="h-3.5 w-3.5" />
                    <span>Raise Formal Inspection Dispute</span>
                  </button>
                )}

                {effectiveRole === 'SELLER' && drawerData.status === 'DELIVERY_PENDING' && (
                  <Link
                    href={`/seller/transaction/${drawerData.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    Upload Delivery Evidence Files
                  </Link>
                )}

                {effectiveRole === 'ADMIN' && ['MANUAL_REVIEW', 'VERIFICATION_FAILED'].includes(drawerData.status) && (
                  <div className="space-y-2">
                    <button
                      disabled={viewAsRole !== null}
                      onClick={() => setOverrideModalOpen(true)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-500/20 hover:bg-red-500 disabled:opacity-50 transition-colors"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Override Aegis Security & Approve (Step-Up Auth)
                    </button>
                  </div>
                )}

                {effectiveRole === 'ADMIN' && drawerData.status === 'AWAITING_MANUAL_TRIAGE' && (
                  <Link
                    href={detailUrl(drawerData.id)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-500 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    Review & Manual Vision Triage
                  </Link>
                )}

                {(effectiveRole === 'BUYER' || effectiveRole === 'ADMIN') && drawerData.status === 'IN_TRANSIT_UNVERIFIED' && (
                  <Link
                    href={detailUrl(drawerData.id)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:bg-cyan-500 transition-colors"
                  >
                    <Truck className="h-4 w-4" />
                    Submit Consignee Attestation & GPS
                  </Link>
                )}

                {effectiveRole === 'ADMIN' && drawerData.status === 'SETTLEMENT_QUEUED' && (
                  <Link
                    href={detailUrl(drawerData.id)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Execute Queued Batch Settlement
                  </Link>
                )}

                <Link
                  href={detailUrl(drawerData.id)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  <span>Open Full Detail Page</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Command Palette (Cmd+K) ── */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        transactions={transactions}
        onSelectFilter={(filterKey) => {
          if (filterKey === 'action_required') handleTabChange('action_required');
          else if (filterKey === 'settled') handleTabChange('settled');
          else handlePresetSelect(filterKey);
        }}
      />

      {/* ── Raise Formal Dispute Modal ── */}
      {drawerData && (
        <RaiseDisputeModal
          open={disputeModalOpen}
          onOpenChange={setDisputeModalOpen}
          transactionId={drawerData.id}
          transactionNumber={drawerData.transactionNumber}
          maxAmount={drawerData.amount}
          onDisputeRaised={async () => {
            if (onRefresh) await onRefresh();
            if (selectedTxnId) await openDrawer(drawerData);
          }}
        />
      )}

      {/* ── Step-Up Re-Authentication Confirmation Modal ── */}
      <TypedConfirmationDialog
        open={overrideModalOpen}
        onOpenChange={setOverrideModalOpen}
        title="Step-Up Auth: Override Aegis Forensic Interception"
        description="This high-stakes action will bypass Aegis security validation and release locked escrow funds. Re-enter your password and confirm authorization below."
        requiredKeyword="OVERRIDE"
        requireReason={true}
        reasonPlaceholder="Mandatory compliance rationale for overriding forensic security flag…"
        requireStepUpAuth={true}
        stepUpAuthLabel="Confirm Account Password for Step-Up Multi-Sig"
        warningNote="Warning: Disbursed funds cannot be recalled once settled via RBI nodal gateway."
        confirmLabel="Authorize & Disburse"
        isDestructive={true}
        isLoading={acting === 'resolve'}
        onReasonChange={setOverrideReason}
        onConfirm={async () => {
          await handleDrawerAction('resolve', { decision: 'APPROVED', reason: overrideReason });
          setOverrideModalOpen(false);
        }}
      />
    </div>
  );
}
