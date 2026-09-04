'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Users,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  IndianRupee,
  Layers,
  Sparkles,
  UserX,
  FileKey,
  History,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  X,
  Briefcase,
  FileText,
} from 'lucide-react';
import StatusBadge from '@/components/status-badge';
import { formatDate, formatINR } from '@/lib/utils';
import { FinancialAmount } from '@/components/ui/financial-amount';
import { FreshnessIndicator } from '@/components/ui/freshness-indicator';
import { ActionInboxDashboard, DashboardTransaction } from '@/components/dashboard/action-inbox-dashboard';
import { TombstoneBadge } from '@/components/privacy/tombstone-badge';
import { TypedConfirmationDialog } from '@/components/ui/alert-dialog';
import { SystemHealthDegradationBar } from '@/components/resilience/system-health-degradation-bar';

type Tx = {
  id: string;
  transactionNumber: string;
  buyerName: string;
  sellerName: string;
  amount: number;
  status: string;
  createdAt: string;
  poNumber?: string;
  productDescription?: string;
};

type Metrics = {
  totalTransactions: number;
  totalPaymentVolume: number | string;
  reservedFunds: number | string;
  settledFunds: number | string;
  recentTransactions: Tx[];
};

type User = {
  id: string;
  email: string;
  name: string;
  company?: string | null;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  isTombstoned?: boolean;
  tombstonedAt?: string | null;
};

const roles: User['role'][] = ['BUYER', 'SELLER', 'ADMIN'];

function AdminDashboardContent() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [allTxns, setAllTxns] = useState<DashboardTransaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState<string | null>(null);
  const [tombstoningUser, setTombstoningUser] = useState<User | null>(null);
  const [tombstoneReason, setTombstoneReason] = useState('Regulatory DPDP Right to be Forgotten Request');
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [metricResponse, userResponse, txnResponse] = await Promise.all([
        fetch('/api/dashboard/metrics', { credentials: 'include' }),
        fetch('/api/users', { credentials: 'include' }),
        fetch('/api/transactions', { credentials: 'include' }),
      ]);

      if (metricResponse.status === 401 || userResponse.status === 401) {
        return router.replace('/login');
      }

      if (!metricResponse.ok) {
        // Clear stale metrics on error to avoid misleading critical financial decisions
        setMetrics(null);
        throw new Error((await metricResponse.json()).error || 'Unable to load dashboard');
      }

      const metricData = await metricResponse.json();
      setMetrics(metricData);

      if (userResponse.ok) {
        setUsers((await userResponse.json()).users || []);
      }

      if (txnResponse.ok) {
        setAllTxns((await txnResponse.json()).transactions || []);
      } else {
        setAllTxns(metricData.recentTransactions || []);
      }

      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setMetrics(null);
      setError(e instanceof Error ? e.message : 'Unable to load admin operations dashboard');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (user: User, role: User['role']) => {
    if (role === user.role) return;
    setChanging(user.id);
    setError(null);
    try {
      const response = await fetch(`/api/users/${user.id}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to change role');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to change role');
    } finally {
      setChanging(null);
    }
  };

  const handleTombstone = async () => {
    if (!tombstoningUser) return;
    setChanging(tombstoningUser.id);
    setError(null);
    try {
      const response = await fetch(`/api/users/${tombstoningUser.id}/tombstone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: tombstoneReason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to tombstone user');
      setTombstoningUser(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to execute cryptographic shredding and tombstone');
    } finally {
      setChanging(null);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex justify-center py-24 text-zinc-500">
        <Loader2 className="mr-2 animate-spin" />
        Loading operations telemetry…
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Platform TPV',
      value: formatINR(Number(metrics?.totalPaymentVolume || 0)),
      subtitle: `${metrics?.totalTransactions || 0} lifetime escrows`,
      icon: IndianRupee,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      label: 'Locked in Escrow Vault',
      value: formatINR(Number(metrics?.reservedFunds || 0)),
      subtitle: 'Reserved nodal funds',
      icon: Lock,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      label: 'Settled Disbursed Volume',
      value: formatINR(Number(metrics?.settledFunds || 0)),
      subtitle: 'RBI RTGS/NEFT payouts',
      icon: CheckCircle2,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Manual Review & Aegis Queue',
      value: String(
        allTxns.filter((t) => ['MANUAL_REVIEW', 'VERIFICATION_FAILED'].includes(t.status)).length
      ),
      subtitle: 'Requiring compliance sign-off',
      icon: ShieldAlert,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <span>Operations & Compliance Cockpit</span>
            <span className="rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-0.5 text-xs font-mono font-medium text-red-300">
              Admin Multi-Sig
            </span>
          </h1>
          <p className="text-sm text-zinc-500">
            Aegis forensic interception overrides, nodal settlement monitoring, and role governance.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* ── Financial Certainty Metrics Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* ── 3rd-Party Gateway Resilience & Graceful Fallback Telemetry (Admin Operations Only) ── */}
      <SystemHealthDegradationBar transactions={allTxns} onRefresh={load} />

      {/* ── Action Inbox Data Table with Aegis Security Drawer & Cmd+K ── */}
      <ActionInboxDashboard
        transactions={allTxns}
        role="ADMIN"
        isLoading={loading}
        error={error}
        lastUpdated={lastUpdated}
        onRefresh={load}
      />

      {/* ── User Access & Multi-Sig Role Governance ── */}
      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            <div>
              <p className="font-bold text-zinc-100">Enterprise User Access & Role Governance</p>
              <p className="text-xs text-zinc-500">
                Click any user identity to inspect their complete counter-party transaction history and statutory audit records.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
            {users.length} Registered Entities
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <th className="px-6 py-3.5">User Identity</th>
                <th className="px-6 py-3.5">Company Affiliation</th>
                <th className="px-6 py-3.5">Assigned Role</th>
                <th className="px-6 py-3.5">Transaction History</th>
                <th className="px-6 py-3.5">Compliance & DPDP/GDPR State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {users.map((user) => {
                const userTxns = allTxns.filter(
                  (t) =>
                    t.buyerId === user.id ||
                    t.sellerId === user.id ||
                    (user.name && t.buyerName?.toLowerCase() === user.name.toLowerCase()) ||
                    (user.name && t.sellerName?.toLowerCase() === user.name.toLowerCase()) ||
                    (user.company && t.buyerCompany?.toLowerCase() === user.company.toLowerCase()) ||
                    (user.company && t.sellerCompany?.toLowerCase() === user.company.toLowerCase())
                );

                return (
                  <tr key={user.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-3.5">
                      <button
                        type="button"
                        onClick={() => setSelectedUserForHistory(user)}
                        className="text-left group cursor-pointer focus:outline-none"
                        title="Click to view full transaction history"
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-zinc-200 group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                            <span>{user.name}</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-blue-400 transition-opacity" />
                          </p>
                          {user.isTombstoned && <TombstoneBadge variant="compact" />}
                        </div>
                        <p className="text-xs font-mono text-zinc-500 group-hover:text-zinc-400 transition-colors">{user.email}</p>
                      </button>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-zinc-400">{user.company || '—'}</td>
                    <td className="px-6 py-3.5">
                      <select
                        aria-label={`Role for ${user.name}`}
                        value={user.role}
                        disabled={changing === user.id || user.isTombstoned}
                        onChange={(e) => void changeRole(user, e.target.value as User['role'])}
                        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-200 disabled:opacity-50 focus:border-blue-500 focus:outline-none"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        type="button"
                        onClick={() => setSelectedUserForHistory(user)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-blue-400 hover:border-blue-500/60 hover:bg-blue-500/10 hover:text-blue-300 transition-all shadow-sm group"
                      >
                        <History className="h-3.5 w-3.5 text-blue-400 group-hover:rotate-[-45deg] transition-transform" />
                        <span className="font-mono">{userTxns.length} Escrow{userTxns.length === 1 ? '' : 's'}</span>
                        <ChevronRight className="h-3 w-3 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </td>
                    <td className="px-6 py-3.5">
                      {user.isTombstoned ? (
                        <div className="flex items-center gap-2">
                          <TombstoneBadge variant="full" />
                          {user.tombstonedAt && (
                            <span className="text-[11px] font-mono text-zinc-500">
                              {formatDate(user.tombstonedAt)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setTombstoningUser(user)}
                          disabled={changing === user.id || user.role === 'ADMIN'}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          <span>Tombstone & Shred DEK</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Slide-Over / Modal: Entity Transaction History ── */}
      {selectedUserForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedUserForHistory(null)}
          />

          {/* Dialog Container */}
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/70 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-zinc-100">{selectedUserForHistory.name}</h2>
                    {selectedUserForHistory.isTombstoned && <TombstoneBadge variant="compact" />}
                    <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-mono font-medium text-zinc-300">
                      {selectedUserForHistory.role}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
                    <span>{selectedUserForHistory.email}</span>
                    <span>•</span>
                    <span>{selectedUserForHistory.company || 'Direct Entity'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForHistory(null)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Entity Summary Metrics */}
            {(() => {
              const matchedTxns = allTxns.filter(
                (t) =>
                  t.buyerId === selectedUserForHistory.id ||
                  t.sellerId === selectedUserForHistory.id ||
                  (selectedUserForHistory.name && t.buyerName?.toLowerCase() === selectedUserForHistory.name.toLowerCase()) ||
                  (selectedUserForHistory.name && t.sellerName?.toLowerCase() === selectedUserForHistory.name.toLowerCase()) ||
                  (selectedUserForHistory.company && t.buyerCompany?.toLowerCase() === selectedUserForHistory.company.toLowerCase()) ||
                  (selectedUserForHistory.company && t.sellerCompany?.toLowerCase() === selectedUserForHistory.company.toLowerCase())
              );
              const totalVolume = matchedTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
              const settledTxns = matchedTxns.filter((t) => t.status === 'SETTLED');
              const activeTxns = matchedTxns.filter((t) => t.status !== 'SETTLED' && t.status !== 'REFUNDED');

              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b border-zinc-800/80 bg-zinc-950/30">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <span className="text-[11px] font-medium text-zinc-400">Total Transacted</span>
                      <p className="text-lg font-bold font-mono text-zinc-100 mt-0.5">{formatINR(totalVolume)}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <span className="text-[11px] font-medium text-zinc-400">Total Escrows</span>
                      <p className="text-lg font-bold font-mono text-blue-400 mt-0.5">{matchedTxns.length} Orders</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <span className="text-[11px] font-medium text-zinc-400">Settled (Disbursed)</span>
                      <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{settledTxns.length}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <span className="text-[11px] font-medium text-zinc-400">In-Flight / Queued</span>
                      <p className="text-lg font-bold font-mono text-amber-400 mt-0.5">{activeTxns.length}</p>
                    </div>
                  </div>

                  {/* Transactions List */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Historical Escrow Ledger ({matchedTxns.length})
                      </h3>
                      {selectedUserForHistory.isTombstoned && (
                        <span className="text-[11px] text-amber-400 font-mono bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          7-Year RBI Statutory Preservation Active
                        </span>
                      )}
                    </div>

                    {matchedTxns.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/20">
                        <FileText className="h-8 w-8 text-zinc-600 mb-2" />
                        <p className="text-sm font-semibold text-zinc-400">No transactions recorded</p>
                        <p className="text-xs text-zinc-500 mt-1">This user has not yet created or participated in any B2B escrow orders.</p>
                      </div>
                    ) : (
                      matchedTxns.map((tx) => {
                        const isBuyer = tx.buyerId === selectedUserForHistory.id || tx.buyerName?.toLowerCase() === selectedUserForHistory.name.toLowerCase();
                        const counterPartyName = isBuyer ? tx.sellerName : tx.buyerName;
                        const isDual = (tx.amount >= 1_000_000) || tx.requiresDualApproval;
                        const hasBothSigns = Boolean(tx.firstApproverId && tx.secondApproverId);

                        return (
                          <div
                            key={tx.id}
                            className="group rounded-xl border border-zinc-800/80 bg-zinc-950/50 hover:bg-zinc-800/40 p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                          >
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                                  {tx.transactionNumber}
                                </span>
                                <StatusBadge status={tx.status} />
                                {tx.poNumber && (
                                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                    PO: {tx.poNumber}
                                  </span>
                                )}
                                {isDual && (
                                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                    hasBothSigns || tx.status === 'SETTLED'
                                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                      : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                  }`}>
                                    {hasBothSigns || tx.status === 'SETTLED' ? '2/2 Multi-Sig' : 'Dual Approval Required'}
                                  </span>
                                )}
                              </div>

                              <p className="text-sm font-medium text-zinc-200 truncate">
                                {tx.productDescription || 'Industrial B2B Procurement Contract'}
                              </p>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                                <span>
                                  Role: <strong className="text-zinc-300 font-semibold">{isBuyer ? 'Buyer' : 'Seller'}</strong>
                                </span>
                                <span>
                                  Counter-Party: <strong className="text-zinc-300 font-semibold">{counterPartyName || 'Enterprise Counter-Party'}</strong>
                                </span>
                                <span className="font-mono text-zinc-500 text-[11px]">
                                  {formatDate(tx.createdAt)}
                                </span>
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                              <div className="text-left sm:text-right">
                                <span className="text-xs text-zinc-500 block">Order Value</span>
                                <span className="text-base font-bold font-mono text-zinc-100">
                                  {formatINR(tx.amount)}
                                </span>
                              </div>

                              <Link
                                href={`/admin/transaction/${tx.id}`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors"
                              >
                                <span>Inspect Cockpit</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950/60 px-6 py-3 text-xs text-zinc-500">
              <span className="font-mono">RazorChain Decentralized Escrow Engine</span>
              <button
                type="button"
                onClick={() => setSelectedUserForHistory(null)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Typed Confirmation for Tombstone & Cryptographic Shredding ── */}
      <TypedConfirmationDialog
        open={Boolean(tombstoningUser)}
        onOpenChange={(open) => {
          if (!open) setTombstoningUser(null);
        }}
        title={`Execute Tombstone & Cryptographic Shredding for ${tombstoningUser?.name || 'User'}?`}
        description="This will permanently redact all PII (name, email, address, phone) to generic anonymous identifiers and cryptographically revoke/shred the KMS Data Encryption Keys (DEK) for all associated documents. Financial ledger entries and Merkle proofs are preserved for 7-year RBI statutory compliance."
        requiredKeyword="TOMBSTONE"
        requireReason={true}
        reasonPlaceholder="Regulatory DPDP Right to be Forgotten Request"
        confirmLabel="Cryptographically Shred & Tombstone"
        isDestructive={true}
        onReasonChange={setTombstoneReason}
        onConfirm={handleTombstone}
      />
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24 text-zinc-500">
          <Loader2 className="mr-2 animate-spin" /> Loading Admin Operations Cockpit…
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
