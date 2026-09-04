'use client';

import React from 'react';
import { Shield, CheckCircle2, Clock, AlertTriangle, Lock } from 'lucide-react';
import { cn, formatINR } from '@/lib/utils';

export type FinancialState = 'SETTLED' | 'RESERVED' | 'PENDING' | 'DISPUTED' | 'REFUNDED' | 'DEFAULT';

export function getFinancialStateFromStatus(status?: string): FinancialState {
  if (!status) return 'DEFAULT';
  const s = status.toUpperCase();
  if (['SETTLED', 'CAPTURED', 'PAID'].includes(s)) return 'SETTLED';
  if (['FUNDS_RESERVED', 'PAYMENT_AUTHORIZED', 'VERIFIED', 'MANUAL_REVIEW'].includes(s)) return 'RESERVED';
  if (['CREATED', 'DELIVERY_PENDING', 'VERIFICATION_PENDING'].includes(s)) return 'PENDING';
  if (['DISPUTED', 'VERIFICATION_FAILED', 'BLOCKED'].includes(s)) return 'DISPUTED';
  if (['REFUNDED', 'CANCELLED'].includes(s)) return 'REFUNDED';
  return 'DEFAULT';
}

interface FinancialAmountProps {
  amount: number;
  state?: FinancialState;
  status?: string;
  currency?: string;
  showIcon?: boolean;
  showBadge?: boolean;
  className?: string;
  tooltipText?: string;
}

export function FinancialAmount({
  amount,
  state: explicitState,
  status,
  currency = 'INR',
  showIcon = false,
  showBadge = false,
  className,
  tooltipText,
}: FinancialAmountProps) {
  const financialState = explicitState || getFinancialStateFromStatus(status);
  const formatted = formatINR(amount);

  let defaultTooltip = '';
  let textClass = 'text-zinc-100 font-medium';
  let decorationClass = '';
  let badgeClass = '';
  let badgeLabel = '';
  let Icon = null;

  switch (financialState) {
    case 'SETTLED':
      textClass = 'text-emerald-400 font-bold';
      decorationClass = '';
      badgeClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      badgeLabel = 'Settled';
      defaultTooltip = 'Settled: Funds have been disbursed directly to the seller account.';
      Icon = CheckCircle2;
      break;

    case 'RESERVED':
      textClass = 'text-indigo-300 font-semibold';
      decorationClass = 'underline decoration-dashed decoration-indigo-400/60 underline-offset-4 cursor-help';
      badgeClass = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      badgeLabel = 'Reserved in Vault';
      defaultTooltip = 'Reserved: Escrow funds are securely locked in the RBI-compliant nodal account, irrevocable until AI verification.';
      Icon = Lock;
      break;

    case 'PENDING':
      textClass = 'text-zinc-400 font-normal';
      decorationClass = 'decoration-dotted decoration-zinc-500';
      badgeClass = 'bg-zinc-800 text-zinc-400 border-zinc-700';
      badgeLabel = 'Pending Authorization';
      defaultTooltip = 'Pending: Payment authorization or invoice processing in progress.';
      Icon = Clock;
      break;

    case 'DISPUTED':
      textClass = 'text-red-400 font-semibold line-through decoration-red-500';
      badgeClass = 'bg-red-500/15 text-red-300 border-red-500/30';
      badgeLabel = 'Disputed / Held';
      defaultTooltip = 'Held: Escrow release blocked by Aegis Firewall or manual dispute.';
      Icon = AlertTriangle;
      break;

    case 'REFUNDED':
      textClass = 'text-zinc-500 line-through';
      badgeClass = 'bg-zinc-800 text-zinc-500 border-zinc-700';
      badgeLabel = 'Refunded';
      defaultTooltip = 'Refunded: Funds returned to buyer.';
      Icon = Shield;
      break;

    default:
      textClass = 'text-zinc-200 font-medium';
      defaultTooltip = 'Escrow transaction amount';
      break;
  }

  const activeTooltip = tooltipText || defaultTooltip;

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={activeTooltip}>
      {showIcon && Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />}
      <span className={cn(textClass, decorationClass)}>
        {formatted}
      </span>
      {showBadge && badgeLabel && (
        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-mono tracking-tight', badgeClass)}>
          {badgeLabel}
        </span>
      )}
    </span>
  );
}
