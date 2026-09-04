'use client';

import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Loader2,
  Lock,
  UserCheck,
  Building2,
  User,
} from 'lucide-react';
import { cn, formatDateTime, formatINR } from '@/lib/utils';

interface MakerCheckerPanelProps {
  transactionId: string;
  amount: number;
  threshold?: number;
  requiresDualApproval?: boolean;
  firstApproverId?: string | null;
  firstApprovedAt?: string | Date | null;
  firstApproverName?: string | null;
  secondApproverId?: string | null;
  secondApprovedAt?: string | Date | null;
  secondApproverName?: string | null;
  buyerName?: string | null;
  sellerName?: string | null;
  currentUserId?: string;
  currentUserRole?: string;
  status: string;
  onApproveSignature: (step: 1 | 2) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export function MakerCheckerPanel({
  transactionId,
  amount,
  threshold = 1_000_000,
  requiresDualApproval = false,
  firstApproverId,
  firstApprovedAt,
  firstApproverName,
  secondApproverId,
  secondApprovedAt,
  secondApproverName,
  buyerName = 'Buyer Entity',
  sellerName = 'Seller Enterprise',
  currentUserId,
  currentUserRole = 'BUYER',
  status,
  onApproveSignature,
  isLoading = false,
  className,
}: MakerCheckerPanelProps) {
  const isHighValue = amount >= threshold || requiresDualApproval;
  if (!isHighValue && !firstApproverId) return null;

  const hasBuyerSignature = Boolean(firstApproverId);
  const hasSellerSignature = Boolean(secondApproverId);
  const isSettled = ['SETTLED', 'REFUNDED', 'CANCELLED'].includes(status);

  const role = currentUserRole.toUpperCase();
  const isBuyer = role === 'BUYER';
  const isSeller = role === 'SELLER';
  const isAdmin = role === 'ADMIN';

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 shadow-xl space-y-4 transition-all',
        hasSellerSignature
          ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-zinc-900 to-zinc-950'
          : hasBuyerSignature
          ? 'border-blue-500/40 bg-gradient-to-br from-blue-950/30 via-zinc-900 to-zinc-950'
          : 'border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-zinc-900 to-zinc-950',
        className
      )}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100">
                Four-Eyes Governance: Dual Counterparty Multi-Sig
              </h3>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-300">
                Threshold: ≥ {formatINR(threshold)}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Both Buyer and Seller signatures are required to authorize high-value escrow disbursement.
            </p>
          </div>
        </div>

        <div>
          {hasSellerSignature && hasBuyerSignature ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-mono font-bold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> 2 / 2 Signatures Verified (Complete)
            </span>
          ) : hasBuyerSignature ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/15 px-3 py-1 text-xs font-mono font-bold text-blue-300 animate-pulse">
              <Clock className="h-3.5 w-3.5" /> 1 / 2 Signatures (Seller Awaiting)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-mono font-bold text-amber-300">
              <AlertCircle className="h-3.5 w-3.5" /> 0 / 2 Signatures (Buyer Awaiting)
            </span>
          )}
        </div>
      </div>

      {/* Two Signature Cards: 1. Buyer and 2. Seller */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Step 1: Buyer Signature */}
        <div
          className={cn(
            'rounded-xl border p-4 space-y-2 relative transition-all',
            hasBuyerSignature
              ? 'border-emerald-500/40 bg-zinc-950/80 text-zinc-200'
              : 'border-zinc-800 bg-zinc-950/40 text-zinc-400'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-400 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-blue-400" />
              1. Buyer Signature (Release)
            </span>
            {hasBuyerSignature ? (
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                SIGNED
              </span>
            ) : (
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                PENDING
              </span>
            )}
          </div>

          <div className="text-xs">
            {hasBuyerSignature ? (
              <div className="space-y-1">
                <p className="font-semibold text-zinc-100 flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                  {firstApproverName || buyerName || 'Buyer Authorized Officer'}
                </p>
                <p className="text-[11px] font-mono text-zinc-500">
                  Signed at: {formatDateTime(firstApprovedAt || new Date())}
                </p>
              </div>
            ) : (
              <p className="text-zinc-500 text-[11px] leading-relaxed">
                Buyer release authorization approving consignment delivery of {formatINR(amount)}.
              </p>
            )}
          </div>
        </div>

        {/* Step 2: Seller Signature */}
        <div
          className={cn(
            'rounded-xl border p-4 space-y-2 relative transition-all',
            hasSellerSignature
              ? 'border-emerald-500/40 bg-zinc-950/80 text-zinc-200'
              : hasBuyerSignature
              ? 'border-blue-500/40 bg-blue-950/20 text-zinc-300'
              : 'border-zinc-800 bg-zinc-950/40 text-zinc-500'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-indigo-400" />
              2. Seller Signature (Acceptance)
            </span>
            {hasSellerSignature ? (
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                SIGNED
              </span>
            ) : hasBuyerSignature ? (
              <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-300 animate-pulse">
                REQUIRES SELLER SIGN
              </span>
            ) : (
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-500">
                BLOCKED (Awaiting Buyer)
              </span>
            )}
          </div>

          <div className="text-xs">
            {hasSellerSignature ? (
              <div className="space-y-1">
                <p className="font-semibold text-zinc-100 flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                  {secondApproverName || sellerName || 'Seller Beneficiary Officer'}
                </p>
                <p className="text-[11px] font-mono text-zinc-500">
                  Signed at: {formatDateTime(secondApprovedAt || new Date())}
                </p>
              </div>
            ) : (
              <p className="text-zinc-500 text-[11px] leading-relaxed">
                Seller counterparty signature confirming settlement acceptance.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Action Bar with Strict Role Scoping */}
      {!isSettled && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Case 1: Buyer Signature Pending */}
          {!hasBuyerSignature ? (
            isBuyer || isAdmin ? (
              <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                <span className="text-zinc-300">
                  Ready to submit 1st authorization signature as <strong>Buyer</strong>.
                </span>
                <button
                  disabled={isLoading}
                  onClick={() => onApproveSignature(1)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Sign as Buyer (1 of 2)
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-zinc-400 w-full">
                <Clock className="h-4 w-4 text-amber-400" />
                <span>Awaiting Buyer authorization signature before Seller counterparty can co-sign.</span>
              </div>
            )
          ) : /* Case 2: Buyer Signed, Seller Pending */
          !hasSellerSignature ? (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2 text-zinc-300">
                <CheckCircle2 className="h-4 w-4 text-blue-400" />
                <span>
                  1st signature (Buyer) verified. Ready for 2nd signature (<strong>Seller</strong>).
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={isLoading}
                  onClick={() => onApproveSignature(2)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Sign as Seller (2 of 2)
                </button>
              </div>
            </div>
          ) : (
            /* Case 3: Both Signed */
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Buyer and Seller dual signatures 100% verified. Multi-sig criteria satisfied.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
