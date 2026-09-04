'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Radio, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FreshnessIndicatorProps {
  lastUpdated?: Date | string | number | null;
  isSyncing?: boolean;
  syncLabel?: string;
  onRefresh?: () => void | Promise<void>;
  className?: string;
  showLivePulse?: boolean;
}

export function FreshnessIndicator({
  lastUpdated,
  isSyncing = false,
  syncLabel = 'Syncing…',
  onRefresh,
  className,
  showLivePulse = true,
}: FreshnessIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>('just now');

  useEffect(() => {
    if (!lastUpdated) return;

    const calculate = () => {
      const date = new Date(lastUpdated);
      const diffMs = Date.now() - date.getTime();
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));

      if (diffSec < 10) setTimeAgo('just now');
      else if (diffSec < 60) setTimeAgo(`${diffSec}s ago`);
      else if (diffSec < 3600) setTimeAgo(`${Math.floor(diffSec / 60)}m ago`);
      else setTimeAgo(`${Math.floor(diffSec / 3600)}h ago`);
    };

    calculate();
    const interval = setInterval(calculate, 10000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <div className={cn('flex items-center gap-2 text-xs font-mono text-zinc-400', className)}>
      {isSyncing ? (
        <span className="flex items-center gap-1.5 text-blue-400">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>{syncLabel}</span>
        </span>
      ) : (
        <div className="flex items-center gap-1.5">
          {showLivePulse && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
          <span className="text-zinc-500">Updated {timeAgo}</span>
        </div>
      )}

      {onRefresh && (
        <button
          onClick={() => void onRefresh()}
          disabled={isSyncing}
          title="Force fresh sync"
          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
        </button>
      )}
    </div>
  );
}
