"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  FileX2,
  Lock,
  Building2,
  Mail,
  User,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Info,
  Clock,
  Trash2,
  RefreshCw,
  Database,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import StatusBadge from "@/components/status-badge";
import { TombstoneBadge } from "@/components/privacy/tombstone-badge";
import { TypedConfirmationDialog } from "@/components/ui/alert-dialog";
import { FinancialAmount } from "@/components/ui/financial-amount";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  company?: string | null;
  role: "BUYER" | "SELLER" | "ADMIN";
  taxId?: string | null;
  isTombstoned?: boolean;
  tombstonedAt?: string | null;
  tombstoneReason?: string | null;
  createdAt: string;
}

interface ActiveTransaction {
  id: string;
  transactionNumber: string;
  amount: number;
  status: string;
  productDescription?: string;
  createdAt: string;
}

interface ErasureEligibility {
  isEligible: boolean;
  isTombstoned?: boolean;
  activeCount: number;
  activeTransactions: ActiveTransaction[];
  totalTransactionsCount: number;
  reason: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [eligibility, setEligibility] = useState<ErasureEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Dialog state
  const [erasureModalOpen, setErasureModalOpen] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [erasureError, setErasureError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/users/me", { credentials: "include" });
      if (res.status === 401) {
        return router.replace("/login");
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load profile data");
      }
      const data = await res.json();
      setProfile(data.user);
      setEligibility(data.erasureEligibility);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load settings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExecuteErasure = async (data?: { keyword: string; reason: string; password?: string }) => {
    if (!data?.password) {
      setErasureError("Please enter your current account password for step-up authentication.");
      return;
    }

    setErasing(true);
    setErasureError(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: data.password,
          confirmationKeyword: data.keyword,
          reason: data.reason || "User self-service Right to be Forgotten request",
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Data erasure failed");
      }

      setErasureModalOpen(false);
      setActionSuccess("Account successfully tombstoned and cryptographic keys shredded. Redirecting to login…");

      setTimeout(() => {
        router.replace("/login");
      }, 2000);
    } catch (e) {
      setErasureError(e instanceof Error ? e.message : "Failed to execute data erasure");
    } finally {
      setErasing(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Account Privacy & Settings…
      </div>
    );
  }

  const isBlocked = Boolean(eligibility && !eligibility.isEligible);
  const requiredKeyword = profile?.company?.trim() ? profile.company.trim().toUpperCase() : "ERASE MY DATA";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
            <span>Account Settings & Privacy Cockpit</span>
            {profile?.isTombstoned && <TombstoneBadge variant="full" />}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage organization identity, statutory privacy rights, and cryptographic data lifecycle.
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            loadData();
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          <span>Refresh State</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Profile & Organization Overview */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-xl">
        <div className="border-b border-zinc-800 bg-zinc-950/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-5 w-5 text-blue-400" />
            <h2 className="font-bold text-zinc-100 text-sm">Entity Identity & Governance Profile</h2>
          </div>
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-mono font-bold text-blue-300">
            {profile?.role}
          </span>
        </div>

        <div className="p-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Full Name / Signatory
            </span>
            <p className="font-medium text-zinc-200 text-sm">{profile?.name || "—"}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Official Work Email
            </span>
            <p className="font-mono text-zinc-200 text-sm">{profile?.email || "—"}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Registered Corporation
            </span>
            <p className="font-medium text-zinc-200 text-sm">{profile?.company || "Not Configured"}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Member Since
            </span>
            <p className="font-medium text-zinc-200 text-sm">
              {profile?.createdAt ? formatDate(profile.createdAt) : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Statutory Dual-Retention Model Architecture Box */}
      <section className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-zinc-900 to-zinc-950 p-6 space-y-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
            <Database className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-100">
              Regulatory Compliance: The Dual-Retention Architecture
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Fintech escrow systems operate under strict regulatory standards (RBI Master Directions, PMLA 2002, and Income Tax Act Section 44AA) alongside statutory privacy frameworks (India DPDP Act Article 12 and GDPR Article 17).
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-1 text-xs">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3.5 space-y-1.5">
            <span className="font-bold text-purple-300 flex items-center gap-1.5 text-xs">
              <FileX2 className="h-4 w-4" /> 1. Right to be Forgotten (Shredded)
            </span>
            <p className="text-zinc-400 leading-normal text-[11px]">
              All Personally Identifiable Information (PII) is overwritten with anonymous surrogate hashes. KMS Envelope Keys (DEK) for invoices and delivery proofs are cryptographically destroyed (<code className="font-mono text-purple-300">0x00</code>).
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3.5 space-y-1.5">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="h-4 w-4" /> 2. 7-Year Financial Retention (Retained)
            </span>
            <p className="text-zinc-400 leading-normal text-[11px]">
              Primary keys, immutable double-entry ledger rows, settlement timestamps, banking UTRs, and SHA-256 Merkle root hashes remain mathematically valid for tax and statutory auditing.
            </p>
          </div>
        </div>
      </section>

      {/* The Zero Balance Pre-Condition Health Check */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold text-zinc-100">
              Pre-Condition: Zero Active Balance & Escrow Lock Rule
            </h3>
          </div>
          {isBlocked ? (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
              BLOCKED BY ACTIVE ESCROW ({eligibility?.activeCount})
            </span>
          ) : (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
              PRE-CONDITIONS MET (0 ACTIVE)
            </span>
          )}
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Before initiating data erasure, your financial balance and escrow commitments must be clear. A user cannot erase data while escrow funds are reserved, goods are in transit, or disputes are pending. All transactions must be in terminal states (<code className="font-mono text-zinc-300">SETTLED</code>, <code className="font-mono text-zinc-300">CANCELLED</code>, or <code className="font-mono text-zinc-300">REFUNDED</code>).
        </p>

        {isBlocked && eligibility?.activeTransactions && eligibility.activeTransactions.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>The following {eligibility.activeTransactions.length} active transactions must reach completion first:</span>
            </div>

            <div className="divide-y divide-zinc-800/80 rounded-lg border border-zinc-800 bg-zinc-950/80 overflow-hidden">
              {eligibility.activeTransactions.map((tx) => (
                <div key={tx.id} className="p-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-200">{tx.transactionNumber}</span>
                      <StatusBadge status={tx.status} />
                    </div>
                    <p className="text-[11px] text-zinc-500">{tx.productDescription || "Escrow purchase order"}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <FinancialAmount amount={tx.amount} status={tx.status} />
                    <Link
                      href={profile?.role === "SELLER" ? `/seller/transaction/${tx.id}` : `/buyer/transaction/${tx.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 hover:bg-zinc-800 transition-colors"
                    >
                      <span>Resolve</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* The Danger Zone */}
      <section className="rounded-2xl border border-red-500/40 bg-gradient-to-br from-red-950/20 via-zinc-900 to-zinc-950 overflow-hidden shadow-2xl">
        <div className="border-b border-red-500/30 bg-red-500/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-red-400" />
            <div>
              <h2 className="font-bold text-red-200 text-sm">Danger Zone: Right to be Forgotten (DPDP / GDPR Art 17)</h2>
              <p className="text-[11px] text-red-300/80">
                Permanent PII Redaction and KMS Data Encryption Key (DEK) Cryptographic Destruction.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-xl border border-red-500/20 bg-zinc-950/70 p-4 space-y-2 text-xs text-zinc-300">
            <p className="font-bold text-zinc-100 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-red-400" /> What happens when you execute Account Erasure:
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px]">
              <li>Your personal name, email, address, and KYC records are irreversibly anonymized.</li>
              <li>KMS encryption keys for your uploaded delivery challans, invoices, and receipts are destroyed.</li>
              <li>Your active login session is terminated immediately across all devices.</li>
              <li>Past counterparty dashboards will display your entity as <code className="font-mono text-purple-300">[REDACTED USER]</code> with a <code className="font-mono text-purple-300">&lt;TombstoneBadge /&gt;</code>.</li>
              <li>Financial amounts, UTR payout codes, and SHA-256 Merkle proofs remain intact for 7-year RBI statutory compliance.</li>
            </ul>
          </div>

          {erasureError && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-3 text-xs text-red-300">
              {erasureError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <div>
              <p className="text-xs font-bold text-zinc-200">Execute Data Erasure & KMS Key Destruction</p>
              <p className="text-[11px] text-zinc-500">Requires Step-Up Authentication (Password + Typed Confirmation phrase).</p>
            </div>

            <button
              onClick={() => {
                setErasureError(null);
                setErasureModalOpen(true);
              }}
              disabled={isBlocked || erasing || profile?.isTombstoned}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-500/25 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Trash2 className="h-4 w-4" />
              <span>{profile?.isTombstoned ? "Account Already Tombstoned" : "Request Data Erasure & Key Shredding"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Step-Up Authentication & Typed Confirmation Dialog */}
      <TypedConfirmationDialog
        open={erasureModalOpen}
        onOpenChange={(open) => {
          if (!open) setErasureError(null);
          setErasureModalOpen(open);
        }}
        title="Authorize Account Erasure & Cryptographic Shredding?"
        description="This high-stakes action will permanently redact all personal identifiers and destroy the encryption keys for your uploaded evidentiary documents. Financial ledger entries and Merkle proofs will be retained for statutory 7-year regulatory compliance."
        warningNote="Action is permanent and cannot be undone. You will be instantly logged out."
        requiredKeyword={requiredKeyword}
        confirmLabel="Authorize Erasure & Shred DEKs"
        isDestructive={true}
        isLoading={erasing}
        requireStepUpAuth={true}
        stepUpAuthLabel="Step-Up Authentication: Enter Account Password"
        requireReason={true}
        reasonPlaceholder="Regulatory DPDP Article 12 Right to be Forgotten Request"
        onConfirm={handleExecuteErasure}
      />
    </div>
  );
}
