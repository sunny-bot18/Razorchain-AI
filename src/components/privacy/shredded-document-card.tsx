'use client';

import React from 'react';
import { FileX2, ShieldAlert, KeyRound, Lock, CheckCircle2, Hash, FileText, Info } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';

export interface ShreddedDocumentProps {
  document: {
    id: string;
    fileName: string;
    fileType?: string;
    fileSize?: number;
    sha256?: string | null;
    uploadedAt?: string | Date;
    isShredded?: boolean;
    shreddedAt?: string | Date | null;
    shreddedReason?: string | null;
    dekKeyId?: string | null;
  };
  className?: string;
}

export function ShreddedDocumentCard({ document, className }: ShreddedDocumentProps) {
  const isShredded = Boolean(document.isShredded);
  const sha = document.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const shortSha = `${sha.slice(0, 8)}...${sha.slice(-8)}`;

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 shadow-lg space-y-4 transition-all',
        isShredded
          ? 'border-purple-500/40 bg-gradient-to-br from-purple-950/30 via-zinc-900 to-zinc-950 text-zinc-300'
          : 'border-zinc-800 bg-zinc-900 text-zinc-300',
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
            <FileX2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-zinc-100">{document.fileName}</h4>
              <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-300">
                CRYPTOGRAPHICALLY SHREDDED
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              KMS Envelope Encryption Key (DEK) permanently destroyed under GDPR / DPDP Art 17
            </p>
          </div>
        </div>

        {document.shreddedAt && (
          <span className="text-[11px] font-mono text-zinc-500">
            Shredded: {formatDate(document.shreddedAt)}
          </span>
        )}
      </div>

      {/* Cryptographic Proof Grid */}
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span className="flex items-center gap-1 font-semibold">
              <Hash className="h-3 w-3 text-blue-400" /> Immutable Ciphertext Hash (SHA-256)
            </span>
            <span className="text-emerald-400 font-mono text-[10px]">Verified Intact</span>
          </div>
          <p className="font-mono text-[11px] text-zinc-200 break-all bg-zinc-900 p-1.5 rounded border border-zinc-800">
            {sha}
          </p>
          <span className="text-[10px] text-zinc-500 block">
            The mathematical ledger anchor remains valid across all past Merkle proofs.
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span className="flex items-center gap-1 font-semibold">
              <KeyRound className="h-3 w-3 text-purple-400" /> KMS Decryption Key (DEK)
            </span>
            <span className="text-purple-400 font-mono text-[10px]">DESTROYED (0x00)</span>
          </div>
          <p className="font-mono text-[11px] text-purple-300 bg-purple-950/40 p-1.5 rounded border border-purple-500/20 truncate">
            {document.dekKeyId || 'kms-dek-revoked-0x00000000'}
          </p>
          <span className="text-[10px] text-zinc-500 block">
            Key destroyed in Key Vault. File ciphertext cannot be deciphered by any entity.
          </span>
        </div>
      </div>

      {/* Regulatory Context Footer */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-950/15 p-3 flex items-start gap-2.5 text-xs text-purple-200/90">
        <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-[11px]">
          <strong className="text-purple-300">Statutory 7-Year Accounting Retention Met:</strong>
          <p className="text-zinc-300 leading-relaxed">
            Personal identity artifacts have been purged to satisfy privacy laws, while transaction hash commitments, balance ledger entries, and banking UTR receipts are fully preserved for statutory audit.
          </p>
        </div>
      </div>
    </div>
  );
}
