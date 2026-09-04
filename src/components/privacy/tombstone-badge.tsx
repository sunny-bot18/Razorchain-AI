'use client';

import React from 'react';
import { EyeOff, ShieldAlert, Lock, Info } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { cn, formatDate } from '@/lib/utils';

interface TombstoneBadgeProps {
  isTombstoned?: boolean;
  tombstonedAt?: string | Date | null;
  className?: string;
  variant?: 'compact' | 'full' | 'inline';
}

export function TombstoneBadge({
  isTombstoned = true,
  tombstonedAt,
  className,
  variant = 'compact',
}: TombstoneBadgeProps) {
  if (!isTombstoned) return null;

  const tooltipText = (
    <div className="space-y-1 text-left">
      <div className="flex items-center gap-1.5 font-bold text-purple-300">
        <EyeOff className="h-3.5 w-3.5" />
        <span>Tombstoned Entity (GDPR Article 17)</span>
      </div>
      <p className="text-[11px] text-zinc-300">
        User PII was permanently purged upon statutory account erasure. Relational ledger integrity and 7-year audit records remain mathematically preserved.
      </p>
      {tombstonedAt && (
        <p className="text-[10px] font-mono text-zinc-400">
          Redacted on: {formatDate(tombstonedAt)}
        </p>
      )}
    </div>
  );

  if (variant === 'inline') {
    return (
      <Tooltip content={tooltipText}>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-950/40 px-2 py-0.5 text-[10px] font-mono font-semibold text-purple-300 shadow-sm cursor-help',
            className
          )}
        >
          <EyeOff className="h-3 w-3 text-purple-400" />
          <span>TOMBSTONED</span>
        </span>
      </Tooltip>
    );
  }

  if (variant === 'full') {
    return (
      <div
        className={cn(
          'rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 flex items-center justify-between gap-3 text-xs text-purple-200',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
            <EyeOff className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-zinc-100">Statutory Redacted Entity</span>
            <p className="text-[11px] text-zinc-400">
              PII scrubbed under GDPR / DPDP right to be forgotten. Ledger history retained.
            </p>
          </div>
        </div>
        {tombstonedAt && (
          <span className="text-[10px] font-mono text-purple-300 bg-purple-900/40 px-2 py-1 rounded border border-purple-500/20">
            {formatDate(tombstonedAt)}
          </span>
        )}
      </div>
    );
  }

  return (
    <Tooltip content={tooltipText}>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-purple-300 cursor-help',
          className
        )}
      >
        <EyeOff className="h-3 w-3 text-purple-400" />
        <span>REDACTED</span>
      </span>
    </Tooltip>
  );
}
