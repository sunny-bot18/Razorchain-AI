'use client';

import React from 'react';
import { ShieldAlert, AlertTriangle, Info, Camera, Fingerprint, FileCode, CheckCircle2 } from 'lucide-react';
import { Tooltip, HoverCard } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ForensicFlagMeta {
  title: string;
  category: 'SECURITY' | 'INTEGRITY' | 'MATCH' | 'TELEMETRY';
  explanation: string;
  remedy: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const FORENSIC_FLAG_DICTIONARY: Record<string, ForensicFlagMeta> = {
  EXIF_MISSING: {
    title: 'Missing Camera Hardware Provenance (EXIF)',
    category: 'SECURITY',
    severity: 'MEDIUM',
    explanation: 'This image lacks native camera and mobile hardware metadata (EXIF/TIFF). It indicates the photo was exported through an image editor, messenger (e.g., WhatsApp compression), or artificially generated.',
    remedy: 'Request the driver or warehouse manager upload the original uncompressed camera photograph directly from their device.',
  },
  SYNTHETIC_OR_STRIPPED: {
    title: 'Stripped or Synthetic Bitstream',
    category: 'SECURITY',
    severity: 'HIGH',
    explanation: 'The file header signatures indicate stripped metadata or synthetic generative AI rendering artifacts.',
    remedy: 'Verify the physical document in person or require carrier AWB corroboration.',
  },
  ELA_TAMPER_DETECTED: {
    title: 'Error Level Analysis (ELA) Compression Anomaly',
    category: 'INTEGRITY',
    severity: 'HIGH',
    explanation: 'High-frequency compression variance detected around text/signature bounding boxes, strongly suggesting digital copy-pasting, cloning, or inpainting manipulation.',
    remedy: 'Reject altered proof. Escrow funds will remain locked in nodal account until audited.',
  },
  SYNTHETIC_NOISE_PATTERN_DETECTED: {
    title: 'Generative AI Synthetic Noise Pattern',
    category: 'SECURITY',
    severity: 'HIGH',
    explanation: 'Spatial frequency analysis detected synthetic diffusion grid patterns typical of Midjourney, DALL-E, or Stable Diffusion document generation.',
    remedy: 'Escrow auto-release timers are blocked. Require biometric/GPS-anchored proof of delivery.',
  },
  PERCEPTUAL_DUPLICATE_DETECTED: {
    title: 'Perceptual Hash Duplicate Collision',
    category: 'SECURITY',
    severity: 'HIGH',
    explanation: 'The dHash/pHash perceptual signature of this delivery slip matches an identical document previously submitted for a different escrow claim.',
    remedy: 'Flagged for double-spending / multi-claim fraud. Manual administrative review required.',
  },
  PO_MISMATCH: {
    title: 'Purchase Order Identifier Discrepancy',
    category: 'MATCH',
    severity: 'HIGH',
    explanation: 'The PO number extracted from the delivery challan does not match the purchase order registered in the smart contract.',
    remedy: 'Ask the seller to clarify if this delivery belongs to a related PO batch.',
  },
  QUANTITY_MISMATCH: {
    title: 'Delivered Quantity Variance',
    category: 'MATCH',
    severity: 'MEDIUM',
    explanation: 'The verified line-item quantity on the physical receipt is less than the contracted total.',
    remedy: 'Eligible for partial settlement release if approved by the buyer.',
  },
  ADDRESS_MISMATCH: {
    title: 'Destination Geofence / Address Deviation',
    category: 'MATCH',
    severity: 'HIGH',
    explanation: 'Delivery address text or GPS stamp does not match the contracted recipient destination address.',
    remedy: 'Confirm if goods were redirected to an authorized auxiliary depot.',
  },
  SIGNATURE_MISSING: {
    title: 'Missing Receiver Signature / Stamp',
    category: 'INTEGRITY',
    severity: 'HIGH',
    explanation: 'No authorized consignee signature or company stamp was recognized in the designated receipt box.',
    remedy: 'Require signed delivery acknowledgement from receiver.',
  },
  FUTURE_DATED: {
    title: 'Chronological Inconsistency (Future Dated)',
    category: 'INTEGRITY',
    severity: 'HIGH',
    explanation: 'The receipt date printed on the document is in the future relative to current NTP network time.',
    remedy: 'Re-upload corrected receipt with valid chronological timestamp.',
  },
};

export function normalizeForensicKey(flag: string): string {
  const normalized = flag.toUpperCase().replace(/\s+/g, '_');
  if (normalized === 'EXIF_METADATA_STRIPPED' || normalized === 'EXIF_STRIPPED') {
    return 'EXIF_MISSING';
  }
  return normalized;
}

export function getForensicMeta(flag: string): ForensicFlagMeta {
  const normalized = normalizeForensicKey(flag);
  return (
    FORENSIC_FLAG_DICTIONARY[normalized] || {
      title: flag.replace(/_/g, ' '),
      category: 'SECURITY',
      severity: 'MEDIUM',
      explanation: `Forensic analysis flag raised: ${flag}. This metric failed automated heuristic validation.`,
      remedy: 'Inspect the high-resolution source document in manual review.',
    }
  );
}

interface ForensicBadgeProps {
  flag: string;
  className?: string;
  showHoverDetails?: boolean;
}

export function ForensicBadge({ flag, className, showHoverDetails = true }: ForensicBadgeProps) {
  const meta = getForensicMeta(flag);

  const severityColor =
    meta.severity === 'HIGH'
      ? 'border-red-500/40 bg-red-500/10 text-red-300'
      : meta.severity === 'MEDIUM'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
      : 'border-blue-500/40 bg-blue-500/10 text-blue-300';

  const badgeContent = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-mono font-medium transition-colors hover:brightness-110 cursor-help',
        severityColor,
        className
      )}
    >
      <ShieldAlert className="h-3 w-3 shrink-0" />
      <span>{meta.title}</span>
    </span>
  );

  if (!showHoverDetails) return badgeContent;

  return (
    <HoverCard
      trigger={badgeContent}
      width="w-96"
      className="border-zinc-800 bg-zinc-950 p-4 text-xs shadow-2xl"
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-100">
            <Fingerprint className="h-4 w-4 text-red-400" />
            <span>{meta.title}</span>
          </div>
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase',
              meta.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
            )}
          >
            {meta.severity} RISK
          </span>
        </div>

        <p className="text-zinc-300 leading-relaxed">{meta.explanation}</p>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2.5">
          <p className="text-[11px] font-semibold text-zinc-400">Recommended Resolution:</p>
          <p className="mt-0.5 text-[11px] text-zinc-300">{meta.remedy}</p>
        </div>
      </div>
    </HoverCard>
  );
}
