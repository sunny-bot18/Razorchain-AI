'use client';

import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
  FileSearch,
  FileCheck,
  Lock,
  FileX,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ForensicBadge } from './forensic-tooltip';

interface AiConfidenceCardProps {
  confidence?: number | null; // 0 to 1 or 0 to 100 (Content match confidence)
  status?: string;
  checks?: Record<string, unknown> | null;
  failedChecks?: string[];
  securityFlags?: string[];
  riskScore?: number | null;
  reason?: string | null;
  className?: string;
  onInspectDiscrepancies?: () => void;
}

export function AiConfidenceCard({
  confidence,
  status,
  checks,
  failedChecks = [],
  securityFlags = [],
  riskScore,
  reason,
  className,
  onInspectDiscrepancies,
}: AiConfidenceCardProps) {
  // Verification has only actually run if we have a real confidence score, completed status, or explicit security/check flags
  const hasRunVerification =
    confidence != null ||
    ['VERIFIED', 'VERIFICATION_FAILED'].includes(status || '') ||
    (status === 'MANUAL_REVIEW' && (securityFlags.length > 0 || failedChecks.length > 0));

  const isPreVerification = !hasRunVerification;

  // Normalize content match percentage
  const contentMatchPercent =
    hasRunVerification && confidence != null
      ? confidence <= 1
        ? Math.round(confidence * 100)
        : Math.round(confidence)
      : null;

  const hasForensicFlags = hasRunVerification && (securityFlags.length > 0 || (riskScore != null && riskScore >= 0.8));
  const hasContractDiscrepancies = hasRunVerification && (failedChecks.length > 0 || (contentMatchPercent != null && contentMatchPercent < 85));
  const totalDiscrepancies = hasRunVerification ? failedChecks.length + securityFlags.length : 0;

  const isCleanApproved =
    hasRunVerification &&
    contentMatchPercent != null &&
    contentMatchPercent >= 85 &&
    totalDiscrepancies === 0 &&
    ['VERIFIED', 'SETTLED', 'DISPUTED', 'PAYMENT_AUTHORIZED', 'FUNDS_RESERVED'].includes(status || '');

  // Specific state classification
  let cardBorder = 'border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950';
  let headerBadge = 'bg-zinc-800 text-zinc-300 border-zinc-700';
  let HeaderIcon = FileSearch;
  let headerTitle = 'AI Verification Analysis';
  let headerSubtitle = 'Automated multi-factor evaluation of delivery evidence against smart contract.';

  if (isPreVerification) {
    cardBorder = 'border-zinc-800 bg-zinc-900/60';
    headerBadge = 'bg-zinc-800 text-zinc-400 border-zinc-700';
    HeaderIcon = Clock;
    headerTitle = 'AI Verification: Awaiting Delivery Proof';
    headerSubtitle = 'Automated OCR extraction and Aegis forensic scan will execute once delivery evidence is uploaded.';
  } else if (hasForensicFlags) {
    // 1. True Forensic Interception (Deepfakes, missing EXIF, ELA tampering)
    cardBorder = 'border-red-500/40 bg-gradient-to-br from-red-950/30 via-zinc-900 to-zinc-950 shadow-red-950/20';
    headerBadge = 'bg-red-500/15 text-red-300 border-red-500/40';
    HeaderIcon = ShieldAlert;
    headerTitle = 'Aegis Firewall: Forensic Interception';
    headerSubtitle =
      'Image provenance or camera metadata failed security policy (EXIF stripped or synthetic noise detected).';
  } else if (failedChecks.length > 0 || (contentMatchPercent != null && contentMatchPercent < 85 && status === 'VERIFICATION_FAILED')) {
    // 2. OCR Contract Term Mismatch (Wrong PO, Shortage, Date Mismatch)
    cardBorder = 'border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-zinc-900 to-zinc-950 shadow-amber-950/20';
    headerBadge = 'bg-amber-500/15 text-amber-300 border-amber-500/40';
    HeaderIcon = FileX;
    headerTitle = 'Contract Verification: Discrepancy Detected';
    headerSubtitle =
      'Physical document evidence does not match contract terms (PO number, delivery date, or quantity mismatch).';
  } else if (isCleanApproved) {
    // 3. Clean & Approved
    cardBorder = 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-950 shadow-emerald-950/20';
    headerBadge = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
    HeaderIcon = ShieldCheck;
    headerTitle = 'AI Verification: Clean & Approved';
    headerSubtitle = '100% match across contract line items, delivery address, timestamps, and camera provenance.';
  } else if (status === 'MANUAL_REVIEW') {
    cardBorder = 'border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-zinc-900 to-zinc-950 shadow-amber-950/20';
    headerBadge = 'bg-amber-500/15 text-amber-300 border-amber-500/40';
    HeaderIcon = AlertTriangle;
    headerTitle = 'Manual Compliance Review Required';
    headerSubtitle = 'Awaiting human compliance sign-off or dual-approval before fund release.';
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border p-6 shadow-xl transition-all', cardBorder, className)}>
      {/* ── Top Header Row ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              Gemini VisionAgent & Aegis Firewall
            </span>
          </div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <span>{headerTitle}</span>
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
            {headerSubtitle}
          </p>
        </div>

        {/* State Badge */}
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold font-mono',
              headerBadge
            )}
          >
            <HeaderIcon className="h-3.5 w-3.5" />
            {isPreVerification
              ? 'Awaiting Evidence'
              : hasForensicFlags
              ? 'Blocked by Aegis'
              : hasContractDiscrepancies
              ? 'Contract Mismatch'
              : isCleanApproved
              ? '100% Integrity Verified'
              : status || 'Pending'}
          </span>
          {totalDiscrepancies > 0 && onInspectDiscrepancies && (
            <button
              onClick={onInspectDiscrepancies}
              className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              Inspect Discrepancies →
            </button>
          )}
        </div>
      </div>

      {/* ── Two-Dimensional Metric Breakdown: Content Match vs Forensic Provenance ── */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Dimension 1: Contract Content Matching */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <FileCheck className="h-3.5 w-3.5 text-blue-400" />
              Contract OCR Content Match
            </span>
            {contentMatchPercent != null ? (
              <span
                className={cn(
                  'text-xs font-mono font-bold',
                  contentMatchPercent >= 85 ? 'text-emerald-400' : 'text-amber-400'
                )}
              >
                {contentMatchPercent}% Match
              </span>
            ) : (
              <span className="text-xs font-mono text-zinc-500">Pending</span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                contentMatchPercent != null && contentMatchPercent >= 85 ? 'bg-emerald-500' : 'bg-amber-500'
              )}
              style={{ width: `${contentMatchPercent || 0}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            {isPreVerification
              ? 'Awaiting delivery challan upload from seller.'
              : failedChecks.length > 0
              ? `${failedChecks.length} line-item check(s) failed: ${failedChecks.map((f) => f.replace(/_/g, ' ')).join(', ')}.`
              : contentMatchPercent != null && contentMatchPercent < 85
              ? 'Contract line-item discrepancies detected against specifications.'
              : 'PO #, quantity, recipient name, and dates match.'}
          </p>
        </div>

        {/* Dimension 2: Forensic Security & Camera Provenance */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-indigo-400" />
              Forensic Security & Provenance
            </span>
            <span
              className={cn(
                'text-xs font-mono font-bold',
                isPreVerification
                  ? 'text-zinc-500 font-normal'
                  : hasForensicFlags
                  ? 'text-red-400'
                  : 'text-emerald-400'
              )}
            >
              {isPreVerification ? 'Pending (Not Run)' : hasForensicFlags ? 'FLAGGED / BLOCKED' : 'PASS (Clean)'}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                isPreVerification ? 'bg-zinc-700' : hasForensicFlags ? 'bg-red-500' : 'bg-emerald-500'
              )}
              style={{ width: isPreVerification ? '0%' : '100%' }}
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            {isPreVerification
              ? 'Camera hardware EXIF & ELA scan will execute on receipt upload.'
              : hasForensicFlags
              ? `${securityFlags.length} security anomaly detected (EXIF, ELA, or bitstream).`
              : 'Camera hardware metadata and compression curves verified.'}
          </p>
        </div>
      </div>

      {/* ── Contextual Forensic Tooltips & Badges ── */}
      {!isPreVerification && (() => {
        const canonicalSet = new Set<string>();
        const uniqueFlags: string[] = [];

        const normalizeKey = (f: string) => {
          const k = f.toUpperCase().replace(/\s+/g, '_');
          if (k === 'EXIF_METADATA_STRIPPED' || k === 'EXIF_STRIPPED') return 'EXIF_MISSING';
          return k;
        };

        [...securityFlags, ...failedChecks].forEach((flag) => {
          const k = normalizeKey(flag);
          if (!canonicalSet.has(k)) {
            canonicalSet.add(k);
            uniqueFlags.push(flag);
          }
        });

        if (uniqueFlags.length === 0) return null;

        return (
          <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-2">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Active Discrepancy & Forensic Flags (Hover for explanation):
            </p>
            <div className="flex flex-wrap gap-2">
              {uniqueFlags.map((flag) => (
                <ForensicBadge key={flag} flag={flag} />
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── AI Assessment Summary ── */}
      {reason && !isPreVerification && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-300">
          <span className="font-semibold text-zinc-400">Synthesized Decision Rationale:</span> {reason}
        </div>
      )}
    </div>
  );
}
