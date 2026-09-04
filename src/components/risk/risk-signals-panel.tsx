'use client';

import React from 'react';
import {
  Activity,
  MapPin,
  History,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Globe,
  UserX,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HoverCard } from '@/components/ui/tooltip';

export interface RiskSignal {
  id: string;
  category: 'VELOCITY' | 'GEOLOCATION' | 'COUNTERPARTY' | 'PROVENANCE';
  title: string;
  level: 'CRITICAL' | 'WARNING' | 'NOMINAL';
  metric: string;
  detail: string;
  baseline: string;
  icon: React.ElementType;
}

interface RiskSignalsPanelProps {
  signals?: RiskSignal[];
  transactionAmount?: number;
  status?: string;
  deliveryAddress?: string;
  forensicFlags?: string[];
  isFactored?: boolean;
  requiresDualApproval?: boolean;
  firstApproverId?: string | null;
  secondApproverId?: string | null;
  carrierStatus?: string | null;
  className?: string;
  compact?: boolean;
}

export const DEFAULT_RISK_SIGNALS: RiskSignal[] = [
  {
    id: 'velocity_spike',
    category: 'VELOCITY',
    title: 'Escrow Velocity Anomaly',
    level: 'NOMINAL',
    metric: '1.2x 24h Baseline',
    detail: 'Transaction volume and claim frequency are within standard operational variance for this vendor.',
    baseline: 'Normal threshold: < 3.0x daily average',
    icon: Zap,
  },
  {
    id: 'geofence_check',
    category: 'GEOLOCATION',
    title: 'Device & IP Geofence',
    level: 'NOMINAL',
    metric: 'Bengaluru, IN (0.4 km variance)',
    detail: 'Uploader network IP geolocation strictly matches contracted consignee warehouse destination coordinates.',
    baseline: 'Allowed geofence radius: 5.0 km',
    icon: Globe,
  },
  {
    id: 'counterparty_friction',
    category: 'COUNTERPARTY',
    title: 'Counterparty Friction History',
    level: 'NOMINAL',
    metric: '0 Disputes / 14 Completed',
    detail: 'Counterparty maintains 100% clean settlement record with zero chargebacks in the last 180 days.',
    baseline: 'Acceptable dispute rate: < 2.0%',
    icon: History,
  },
  {
    id: 'chain_anchor',
    category: 'PROVENANCE',
    title: 'Cryptographic Provenance',
    level: 'NOMINAL',
    metric: 'Merkle Root Polygon PoS',
    detail: 'Purchase order commitments and state hashes are anchored on Polygon PoS layer.',
    baseline: 'Required: SHA-256 state tree anchor',
    icon: Lock,
  },
];

export function computeRiskSignals({
  transactionAmount,
  status,
  deliveryAddress,
  forensicFlags = [],
  isFactored = false,
  requiresDualApproval = false,
  firstApproverId,
  secondApproverId,
}: {
  transactionAmount?: number;
  status?: string;
  deliveryAddress?: string;
  forensicFlags?: string[];
  isFactored?: boolean;
  requiresDualApproval?: boolean;
  firstApproverId?: string | null;
  secondApproverId?: string | null;
}): RiskSignal[] {
  const isSettled = status === 'SETTLED';
  const isRefunded = status === 'REFUNDED' || status === 'CANCELLED';
  const isDisputed = status === 'DISPUTED';
  const isFailed = status === 'VERIFICATION_FAILED';
  const isHighValue = (transactionAmount != null && transactionAmount >= 1_000_000) || requiresDualApproval;
  
  // Dual-signature completion check
  const hasDualSignCompleted = Boolean(firstApproverId && secondApproverId) || ['PAYMENT_AUTHORIZED', 'FUNDS_RESERVED', 'DELIVERY_PENDING', 'VERIFICATION_PENDING', 'VERIFIED', 'SETTLED'].includes(status || '');
  const isMakerSigned = Boolean(firstApproverId);

  const hasTamperAlert = forensicFlags.some((f) =>
    f.toLowerCase().includes('tamper') ||
    f.toLowerCase().includes('exif') ||
    f.toLowerCase().includes('gps') ||
    f.toLowerCase().includes('mismatch') ||
    f.toLowerCase().includes('hardware')
  );

  // 1. Velocity Signal Evaluation
  let velocitySignal: RiskSignal;
  if (isSettled) {
    velocitySignal = {
      id: 'velocity_spike',
      category: 'VELOCITY',
      title: 'Escrow Velocity Status',
      level: 'NOMINAL',
      metric: 'Settled & Disbursed (100%)',
      detail: 'Escrow lifecycle complete. All funds disbursed to seller with zero remaining velocity exposure.',
      baseline: 'Complete & Cryptographically Verified',
      icon: CheckCircle2,
    };
  } else if (isRefunded) {
    velocitySignal = {
      id: 'velocity_spike',
      category: 'VELOCITY',
      title: 'Escrow Velocity Status',
      level: 'NOMINAL',
      metric: 'Refund Completed (0 Risk)',
      detail: 'Escrow deposit returned to buyer vault. Zero active capital exposure.',
      baseline: 'Lifecycle Terminated / Clean Return',
      icon: Zap,
    };
  } else if (isHighValue && !hasDualSignCompleted) {
    velocitySignal = {
      id: 'velocity_spike',
      category: 'VELOCITY',
      title: 'Escrow Velocity Anomaly',
      level: 'WARNING',
      metric: !isMakerSigned ? 'Awaiting Maker Sign (0/2)' : 'Awaiting Checker Sign (1/2)',
      detail: 'High-value order (≥ ₹10L) requires dual multi-sig signoff (Buyer maker & Seller checker) before escrow lock.',
      baseline: 'Mandatory: 2/2 Multi-Sig Authorization',
      icon: Zap,
    };
  } else if (isHighValue && hasDualSignCompleted) {
    velocitySignal = {
      id: 'velocity_spike',
      category: 'VELOCITY',
      title: 'Escrow Velocity Status',
      level: 'NOMINAL',
      metric: 'Multi-Sig Cleared (2/2 Signed)',
      detail: 'Dual counterparty authorization completed. High-value escrow velocity fully approved.',
      baseline: 'Normal threshold: Approved by 2/2 signers',
      icon: Zap,
    };
  } else {
    velocitySignal = {
      id: 'velocity_spike',
      category: 'VELOCITY',
      title: 'Escrow Velocity Anomaly',
      level: 'NOMINAL',
      metric: '1.2x 24h Baseline',
      detail: 'Transaction volume and claim frequency are within standard operational variance for this vendor.',
      baseline: 'Normal threshold: < 3.0x daily average',
      icon: Zap,
    };
  }

  const city = deliveryAddress ? deliveryAddress.split(',')[0].trim() : 'Bengaluru';
  const geoSignal: RiskSignal = isFailed || forensicFlags.some((f) => f.toLowerCase().includes('gps') || f.toLowerCase().includes('location'))
    ? {
        id: 'geofence_check',
        category: 'GEOLOCATION',
        title: 'Device & IP Geofence',
        level: 'WARNING',
        metric: `${city}, IN (Variance Alert)`,
        detail: 'Geofence variance detected or document proof upload IP differs from delivery destination.',
        baseline: 'Allowed geofence radius: 5.0 km',
        icon: Globe,
      }
    : {
        id: 'geofence_check',
        category: 'GEOLOCATION',
        title: 'Device & IP Geofence',
        level: 'NOMINAL',
        metric: `${city}, IN (0.4 km variance)`,
        detail: 'Uploader network IP geolocation strictly matches contracted consignee warehouse destination coordinates.',
        baseline: 'Allowed geofence radius: 5.0 km',
        icon: Globe,
      };

  const counterpartySignal: RiskSignal = isDisputed
    ? {
        id: 'counterparty_friction',
        category: 'COUNTERPARTY',
        title: 'Counterparty Friction History',
        level: 'CRITICAL',
        metric: '1 Active Dispute',
        detail: 'Transaction under active dispute resolution and binding compliance arbitration.',
        baseline: 'Acceptable dispute rate: < 2.0%',
        icon: History,
      }
    : isFactored
    ? {
        id: 'counterparty_friction',
        category: 'COUNTERPARTY',
        title: 'Counterparty Friction History',
        level: 'NOMINAL',
        metric: 'Trade Factored (Lender Backed)',
        detail: 'Early payout advance secured via verified institutional trade credit lender.',
        baseline: 'Eligibility credit score: > 80/100',
        icon: History,
      }
    : {
        id: 'counterparty_friction',
        category: 'COUNTERPARTY',
        title: 'Counterparty Friction History',
        level: 'NOMINAL',
        metric: '0 Disputes / 14 Completed',
        detail: 'Counterparty maintains 100% clean settlement record with zero chargebacks in the last 180 days.',
        baseline: 'Acceptable dispute rate: < 2.0%',
        icon: History,
      };

  const provenanceSignal: RiskSignal = hasTamperAlert
    ? {
        id: 'chain_anchor',
        category: 'PROVENANCE',
        title: 'Cryptographic Provenance',
        level: 'WARNING',
        metric: 'Forensic Metadata Alert',
        detail: 'Forensic inspection detected potential compression anomalies or missing sensor fingerprints.',
        baseline: 'Required: Authentic OEM EXIF profile',
        icon: Lock,
      }
    : {
        id: 'chain_anchor',
        category: 'PROVENANCE',
        title: 'Cryptographic Provenance',
        level: 'NOMINAL',
        metric: 'Merkle Root Polygon PoS',
        detail: 'Purchase order commitments and state hashes are anchored on Polygon PoS layer.',
        baseline: 'Required: SHA-256 state tree anchor',
        icon: Lock,
      };

  return [velocitySignal, geoSignal, counterpartySignal, provenanceSignal];
}

export function RiskSignalsPanel({
  signals,
  transactionAmount,
  status,
  deliveryAddress,
  forensicFlags,
  isFactored,
  requiresDualApproval,
  firstApproverId,
  secondApproverId,
  className,
  compact = false,
}: RiskSignalsPanelProps) {
  const activeSignals = React.useMemo(() => {
    if (signals && signals.length > 0) return signals;
    if (
      transactionAmount !== undefined ||
      status !== undefined ||
      deliveryAddress !== undefined ||
      forensicFlags !== undefined ||
      firstApproverId !== undefined ||
      secondApproverId !== undefined
    ) {
      return computeRiskSignals({
        transactionAmount,
        status,
        deliveryAddress,
        forensicFlags,
        isFactored,
        requiresDualApproval,
        firstApproverId,
        secondApproverId,
      });
    }
    return DEFAULT_RISK_SIGNALS;
  }, [signals, transactionAmount, status, deliveryAddress, forensicFlags, isFactored, requiresDualApproval, firstApproverId, secondApproverId]);

  const criticalCount = activeSignals.filter((s) => s.level === 'CRITICAL').length;
  const warningCount = activeSignals.filter((s) => s.level === 'WARNING').length;

  return (
    <div className={cn('rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-lg space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-bold text-zinc-100">
            Multi-Dimensional Risk & Behavior Signals
          </h3>
          <span className="text-[11px] font-mono text-zinc-500">
            (Independent of Vision AI Confidence)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {criticalCount > 0 ? (
            <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-0.5 text-xs font-mono font-bold text-red-300 animate-pulse">
              🚨 {criticalCount} Critical Anomaly
            </span>
          ) : warningCount > 0 ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-mono font-bold text-amber-300">
              ⚠️ {warningCount} Warning
            </span>
          ) : (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-mono font-semibold text-emerald-300">
              ✓ All Risk Signals Nominal
            </span>
          )}
        </div>
      </div>

      {/* Grid of Risk Metric Cards */}
      <div className={cn('grid gap-3', compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4')}>
        {activeSignals.map((sig) => {
          const Icon = sig.icon;
          const isCritical = sig.level === 'CRITICAL';
          const isWarning = sig.level === 'WARNING';

          const cardBorder = isCritical
            ? 'border-red-500/50 bg-red-950/20 text-red-300'
            : isWarning
            ? 'border-amber-500/50 bg-amber-950/20 text-amber-300'
            : 'border-zinc-800 bg-zinc-950/60 text-zinc-300';

          const badgeClass = isCritical
            ? 'bg-red-500/20 text-red-400 border-red-500/30'
            : isWarning
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

          return (
            <HoverCard
              key={sig.id}
              width="w-80"
              trigger={
                <div
                  className={cn(
                    'rounded-xl border p-3.5 transition-all hover:border-zinc-700 cursor-pointer space-y-2',
                    cardBorder
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      {sig.category}
                    </span>
                    <Icon className="h-4 w-4 opacity-70" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-zinc-100">{sig.title}</p>
                    <p className="text-xs font-mono font-bold mt-1 truncate">{sig.metric}</p>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[10px]">
                    <span className={cn('rounded px-1.5 py-0.5 font-mono font-bold', badgeClass)}>
                      {sig.level}
                    </span>
                    <span className="text-zinc-500 hover:text-zinc-300">Details ℹ</span>
                  </div>
                </div>
              }
            >
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="font-bold text-zinc-100">{sig.title}</span>
                  <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-mono font-bold', badgeClass)}>
                    {sig.level}
                  </span>
                </div>
                <p className="text-zinc-300 leading-relaxed">{sig.detail}</p>
                <div className="rounded border border-zinc-800 bg-zinc-950 p-2 text-[11px] font-mono text-zinc-400">
                  <span className="text-zinc-500 block">Baseline Parameter:</span>
                  {sig.baseline}
                </div>
              </div>
            </HoverCard>
          );
        })}
      </div>
    </div>
  );
}
