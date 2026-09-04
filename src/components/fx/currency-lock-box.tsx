'use client';

import React from 'react';
import { ArrowLeftRight, Clock, ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { FinancialAmount } from '@/components/ui/financial-amount';

interface CurrencyLockBoxProps {
  baseAmount: number;
  baseCurrency?: string; // e.g., 'USD'
  settlementAmount: number;
  settlementCurrency?: string; // e.g., 'INR'
  lockedFxRate?: number | null; // e.g., 86.42
  lockedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  status?: string;
  className?: string;
}

export function CurrencyLockBox({
  baseAmount,
  baseCurrency = 'INR',
  settlementAmount,
  settlementCurrency = 'INR',
  lockedFxRate = 1.0,
  lockedAt,
  expiresAt,
  status,
  className,
}: CurrencyLockBoxProps) {
  const isMultiCurrency = baseCurrency.toUpperCase() !== settlementCurrency.toUpperCase();

  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-md space-y-3',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
          <Lock className="h-3.5 w-3.5 text-indigo-400" />
          <span>Guaranteed FX Rate & Precision Lock</span>
        </div>
        <span className="rounded bg-indigo-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-300 border border-indigo-500/30">
          RBI Compliant
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        {/* Base Escrow Commitment */}
        <div className="rounded-lg bg-zinc-900/90 p-3 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Contract Base Currency
          </span>
          <div className="font-mono text-base font-bold text-zinc-100">
            {baseCurrency.toUpperCase()} {baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-zinc-500">Fixed purchase order value</p>
        </div>

        {/* Guaranteed Settlement Conversion */}
        <div className="rounded-lg bg-zinc-900/90 p-3 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Settlement Payout Currency
          </span>
          <div className="font-mono text-base font-bold text-emerald-400">
            {settlementCurrency.toUpperCase()} {settlementAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-zinc-500">Exact nodal disbursement amount</p>
        </div>
      </div>

      {isMultiCurrency && lockedFxRate && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-900/60 px-3 py-2 text-[11px] font-mono text-zinc-400 border border-zinc-800/60">
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5 text-blue-400" />
            <span>
              Locked FX: 1 {baseCurrency.toUpperCase()} = {lockedFxRate.toFixed(4)} {settlementCurrency.toUpperCase()}
            </span>
          </div>
          {lockedAt && <span>Locked at: {formatDateTime(lockedAt)}</span>}
        </div>
      )}
    </div>
  );
}
