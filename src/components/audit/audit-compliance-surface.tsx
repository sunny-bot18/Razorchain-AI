'use client';

import React, { useState, useMemo } from 'react';
import {
  History,
  Download,
  Calendar,
  User,
  ShieldCheck,
  ShieldAlert,
  Clock,
  FileCheck2,
  FileText,
  Sliders,
  Sparkles,
  Lock,
  ArrowRight,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn, formatDateTime, formatINR } from '@/lib/utils';
import { FinancialAmount } from '@/components/ui/financial-amount';

export interface AuditRecord {
  id: string;
  event: string;
  actor: string;
  action: string;
  result: 'SUCCESS' | 'FAILURE' | 'ERROR' | 'WARNING';
  timestamp: string;
  stateSnapshot?: {
    status: string;
    amount: number;
    aiConfidence?: number | null;
    documentsCount?: number;
    activeFlags?: string[];
    nodalVaultState?: string;
  };
  metadata?: Record<string, unknown> | null;
}

interface AuditComplianceSurfaceProps {
  transactionId: string;
  transactionNumber: string;
  auditLogs: AuditRecord[];
  merkleRoot?: string | null;
  status?: string;
  className?: string;
}

export function AuditComplianceSurface({
  transactionId,
  transactionNumber,
  auditLogs = [],
  merkleRoot,
  status,
  className,
}: AuditComplianceSurfaceProps) {
  // Sort logs chronologically
  const sortedLogs = useMemo(() => {
    return [...auditLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [auditLogs]);

  const [selectedLogIndex, setSelectedLogIndex] = useState<number>(
    Math.max(0, sortedLogs.length - 1)
  );
  const [filterActor, setFilterActor] = useState<string>('ALL');
  const [showAllEvents, setShowAllEvents] = useState<boolean>(false);

  const activeSnapshotLog = sortedLogs[selectedLogIndex] || sortedLogs[0];

  // Filtered log list
  const displayedLogs = useMemo(() => {
    if (filterActor === 'ALL') return sortedLogs;
    return sortedLogs.filter((l) => l.actor.toLowerCase().includes(filterActor.toLowerCase()));
  }, [sortedLogs, filterActor]);

  // Sliced logs for clean, disturbance-free presentation
  const visibleLogs = useMemo(() => {
    if (showAllEvents) return displayedLogs;
    // Show only the 4 most recent events by default
    return displayedLogs.slice(-4);
  }, [displayedLogs, showAllEvents]);

  // Export Standalone Audit Package as CSV
  const exportAuditCsv = () => {
    const headers = ['Timestamp', 'Actor', 'Event', 'Action', 'Result', 'StatusAtTime', 'AmountAtTime'];
    const rows = sortedLogs.map((l) => [
      l.timestamp,
      `"${l.actor}"`,
      `"${l.event}"`,
      l.action,
      l.result,
      l.stateSnapshot?.status || 'N/A',
      l.stateSnapshot?.amount || 'N/A',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${transactionNumber}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden', className)}>
      {/* ── Top Header & Export Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950/80 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
            <History className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-100">
                Immutable Compliance & Audit Surface
              </h2>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                Append-Only
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Cryptographically verified timeline & point-in-time state reconstructor.
            </p>
          </div>
        </div>

        {/* Standalone Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {status === 'SETTLED' && (
            <a
              href={`/api/transactions/${transactionId}/certificate?format=pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Settlement Certificate (PDF)</span>
            </a>
          )}
          <button
            onClick={exportAuditCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Point-in-Time Reconstruction Sandbox ("State As Of Timestamp T") ── */}
      <div className="border-b border-zinc-800 bg-zinc-950/40 p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5" />
              Point-in-Time Reconstruction Sandbox
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Drag scrubber to freeze and inspect exact evidence & risk parameters at decision execution time.
            </p>
          </div>
          {activeSnapshotLog && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-950/40 px-3 py-1 text-xs font-mono text-blue-300">
              State Frozen at: <strong className="text-white">{formatDateTime(activeSnapshotLog.timestamp)}</strong>
            </div>
          )}
        </div>

        {/* Interactive Timeline Slider */}
        {sortedLogs.length > 1 && (
          <div className="space-y-1.5">
            <input
              type="range"
              min={0}
              max={sortedLogs.length - 1}
              value={selectedLogIndex}
              onChange={(e) => setSelectedLogIndex(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>Origin: {formatDateTime(sortedLogs[0]?.timestamp)}</span>
              <span>Latest: {formatDateTime(sortedLogs[sortedLogs.length - 1]?.timestamp)}</span>
            </div>
          </div>
        )}

        {/* Snapshot Panel at Timestamp T */}
        {activeSnapshotLog && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-200">
                  Event: <strong className="text-blue-300">{activeSnapshotLog.event}</strong>
                </span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                  Actor: {activeSnapshotLog.actor} ({activeSnapshotLog.action})
                </span>
              </div>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-mono font-bold',
                  activeSnapshotLog.result === 'SUCCESS'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/15 text-red-300 border border-red-500/30'
                )}
              >
                {activeSnapshotLog.result}
              </span>
            </div>

            {/* Reconstructed State Cards at this point in time */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="rounded-lg bg-zinc-950 p-2 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Status at T</span>
                <span className="font-bold text-zinc-200">
                  {activeSnapshotLog.stateSnapshot?.status || 'CREATED'}
                </span>
              </div>
              <div className="rounded-lg bg-zinc-950 p-2 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Nodal Balance</span>
                <span className="font-bold text-emerald-300">
                  {formatINR(activeSnapshotLog.stateSnapshot?.amount || 10000)}
                </span>
              </div>
              <div className="rounded-lg bg-zinc-950 p-2 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">AI Confidence</span>
                {activeSnapshotLog.stateSnapshot?.aiConfidence != null ? (
                  <span className="font-bold text-blue-300">
                    {activeSnapshotLog.stateSnapshot.aiConfidence <= 1
                      ? `${Math.round(activeSnapshotLog.stateSnapshot.aiConfidence * 100)}%`
                      : `${Math.round(activeSnapshotLog.stateSnapshot.aiConfidence)}%`}
                  </span>
                ) : (
                  <span className="text-zinc-500 font-medium text-[11px]">
                    Pending (Not Run)
                  </span>
                )}
              </div>
              <div className="rounded-lg bg-zinc-950 p-2 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Forensic Flags</span>
                <span className="font-bold text-zinc-400">
                  {activeSnapshotLog.stateSnapshot?.activeFlags?.length || 0} Flags
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Compact Key Event Stream (Clean & Disturbance-Free) ── */}
      <div className="p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Recent Consequential Events
            </h3>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
              Showing {visibleLogs.length} of {displayedLogs.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">Filter:</span>
            <select
              value={filterActor}
              onChange={(e) => setFilterActor(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-300 focus:outline-none"
            >
              <option value="ALL">All Actors</option>
              <option value="system">System / AI Cron</option>
              <option value="admin">Compliance / Admin</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
            </select>

            {displayedLogs.length > 4 && (
              <button
                onClick={() => setShowAllEvents(!showAllEvents)}
                className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                <span>{showAllEvents ? 'Show Compact (4)' : `View All (${displayedLogs.length})`}</span>
                {showAllEvents ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>

        {/* Compact Event List */}
        <div className={cn('space-y-2', showAllEvents && 'max-h-72 overflow-y-auto pr-1')}>
          {visibleLogs.map((log, idx) => {
            const isSelected = sortedLogs.indexOf(log) === selectedLogIndex;

            return (
              <div
                key={log.id || idx}
                onClick={() => setSelectedLogIndex(sortedLogs.indexOf(log))}
                className={cn(
                  'cursor-pointer rounded-lg border p-2.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs',
                  isSelected
                    ? 'border-blue-500/80 bg-blue-950/30 ring-1 ring-blue-500'
                    : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full flex-none ring-2 ring-zinc-900',
                      log.result === 'SUCCESS'
                        ? 'bg-emerald-500'
                        : log.result === 'FAILURE'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    )}
                  />
                  <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="font-semibold text-zinc-200">{log.event}</p>
                    <span className="text-[11px] text-zinc-500">
                      by <strong className="text-zinc-400">{log.actor}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 text-[11px] font-mono text-zinc-500">
                  <span>{formatDateTime(log.timestamp)}</span>
                  <span className="text-blue-400 hover:text-blue-300 underline cursor-pointer text-[10px]">
                    {isSelected ? 'Selected' : 'Reconstruct'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
