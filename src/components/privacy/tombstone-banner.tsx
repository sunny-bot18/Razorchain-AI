'use client';

import React from 'react';
import { EyeOff, Eye, ShieldCheck, Lock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TombstoneBannerProps {
  isTombstoned: boolean;
  onToggleTombstone: (val: boolean) => void;
  className?: string;
}

export function TombstoneBanner({
  isTombstoned,
  onToggleTombstone,
  className,
}: TombstoneBannerProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs transition-all shadow-md',
        isTombstoned
          ? 'border-purple-500/50 bg-purple-950/40 text-purple-200'
          : 'border-zinc-800 bg-zinc-900/60 text-zinc-400',
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg',
            isTombstoned ? 'bg-purple-500/20 text-purple-300' : 'bg-zinc-800 text-zinc-400'
          )}
        >
          {isTombstoned ? <EyeOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        </div>
        <div>
          <span className="font-bold text-zinc-100">
            {isTombstoned
              ? 'Tombstone Privacy Mode Active (GDPR / DPDP Article 17)'
              : 'Standard Entity Identity Mode'}
          </span>
          <p className="text-[11px] text-zinc-400">
            {isTombstoned
              ? 'All PII (names, contact info, facilities) masked with cryptographic surrogates. Statutory 7-yr financial ledger retained.'
              : 'Toggle Tombstone mode to inspect regulatory anonymized state.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggleTombstone(!isTombstoned)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
            isTombstoned
              ? 'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-500/25'
              : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          )}
        >
          {isTombstoned ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          <span>{isTombstoned ? 'De-anonymize View' : 'Enable Tombstone Mask'}</span>
        </button>
      </div>
    </div>
  );
}
