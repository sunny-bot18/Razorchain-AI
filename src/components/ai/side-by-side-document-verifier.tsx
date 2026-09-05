'use client';

import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Hash,
  MapPin,
  Calendar,
  PenLine,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ForensicBadge } from './forensic-tooltip';

export interface ExtractedField {
  id: string;
  name: string;
  label: string;
  contractValue: string;
  extractedValue: string;
  status: 'MATCH' | 'MISMATCH' | 'WARN' | 'MISSING';
  confidence: number;
  // Bounding box coordinates in percentages [top, left, width, height]
  boundingBox?: [number, number, number, number];
  icon?: React.ElementType;
}

interface SideBySideDocumentVerifierProps {
  documentUrl?: string;
  documentName?: string;
  documentType?: string;
  fields?: ExtractedField[];
  forensicFlags?: string[];
  onApproveOverride?: () => void;
  onRejectEvidence?: () => void;
  isLoading?: boolean;
  className?: string;
}

export const DEFAULT_SAMPLE_FIELDS: ExtractedField[] = [
  {
    id: 'po_number',
    name: 'po_number',
    label: 'PO Number Reference',
    contractValue: 'PO-2026-8812',
    extractedValue: 'PO-2026-8812',
    status: 'MATCH',
    confidence: 0.99,
    boundingBox: [14, 18, 28, 6],
    icon: Hash,
  },
  {
    id: 'quantity',
    name: 'quantity',
    label: 'Delivered Quantity',
    contractValue: '500 units',
    extractedValue: '500 units (5 cartons)',
    status: 'MATCH',
    confidence: 0.97,
    boundingBox: [32, 18, 45, 8],
    icon: Package,
  },
  {
    id: 'delivery_address',
    name: 'delivery_address',
    label: 'Destination Address',
    contractValue: 'Warehouse 4, Electronic City, Bengaluru',
    extractedValue: 'Warehouse 4, Electronic City, Bengaluru - 560100',
    status: 'MATCH',
    confidence: 0.94,
    boundingBox: [48, 18, 65, 10],
    icon: MapPin,
  },
  {
    id: 'delivery_date',
    name: 'delivery_date',
    label: 'Challan Timestamp',
    contractValue: '2026-09-04',
    extractedValue: '2026-09-04 (14:32 IST)',
    status: 'MATCH',
    confidence: 0.96,
    boundingBox: [65, 18, 38, 7],
    icon: Calendar,
  },
  {
    id: 'receiver_signature',
    name: 'receiver_signature',
    label: 'Consignee Signature & Stamp',
    contractValue: 'Authorized Recipient',
    extractedValue: 'Rajesh Kumar [Verified Digital Inking]',
    status: 'MATCH',
    confidence: 0.92,
    boundingBox: [78, 55, 38, 14],
    icon: PenLine,
  },
];

export function SideBySideDocumentVerifier({
  documentUrl,
  documentName = 'delivery-receipt.jpg',
  documentType = 'image',
  fields = DEFAULT_SAMPLE_FIELDS,
  forensicFlags = [],
  onApproveOverride,
  onRejectEvidence,
  isLoading = false,
  className,
}: SideBySideDocumentVerifierProps) {
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [imageError, setImageError] = useState(false);

  const activeField = fields.find((f) => f.id === activeFieldId);

  return (
    <div className={cn('rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl', className)}>
      {/* Top Cockpit Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/90 px-5 py-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-bold text-zinc-100">
            Side-by-Side Dual-Pane Verification
          </h3>
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-400">
            {documentName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
            className={cn(
              'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors border',
              showBoundingBoxes
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400'
            )}
          >
            <Eye className="h-3 w-3" />
            <span>{showBoundingBoxes ? 'Bounding Boxes: On' : 'Bounding Boxes: Off'}</span>
          </button>
          <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-950 p-0.5 text-zinc-400">
            <button
              onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
              className="p-1 hover:text-zinc-200"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-1.5 text-[10px] font-mono">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
              className="p-1 hover:text-zinc-200"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Dual Pane Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
        {/* Left Pane: Document Canvas & Interactive Bounding Boxes */}
        <div className="lg:col-span-7 relative flex items-center justify-center border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-950/90 p-6 overflow-hidden select-none">
          <div
            className="relative transition-transform duration-200 w-full max-w-md aspect-[3/4] rounded-xl border border-zinc-700/80 bg-zinc-900 shadow-2xl flex flex-col overflow-hidden"
            style={{ transform: `scale(${zoom})` }}
          >
            {documentUrl && !imageError ? (
              <div className="relative w-full h-full flex items-center justify-center bg-zinc-950 p-2 overflow-hidden">
                <img
                  src={documentUrl}
                  alt={documentName}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="flex flex-col h-full p-6">
                {/* Mock physical receipt document canvas texture */}
                <div className="flex items-center justify-between border-b border-zinc-700 pb-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                      DELIVERY CHALLAN & PROOF
                    </span>
                    <p className="text-[10px] text-zinc-500">Official Logistics Consignment</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-zinc-400">
                      {fields.find((f) => f.id === 'po_number')?.extractedValue || 'DELIVERY-DOC'}
                    </span>
                  </div>
                </div>

                {/* Document Body Lines with dynamic field values */}
                <div className="mt-4 space-y-4 font-mono text-xs">
                  <div className="p-2 rounded bg-zinc-800/40">
                    <span className="text-[10px] text-zinc-500 uppercase">PO Reference:</span>
                    <p className="font-bold text-zinc-200">
                      {fields.find((f) => f.id === 'po_number')?.extractedValue || '—'}
                    </p>
                  </div>

                  <div className="p-2 rounded bg-zinc-800/40">
                    <span className="text-[10px] text-zinc-500 uppercase">Delivered Quantity:</span>
                    <p className="font-bold text-zinc-200">
                      {fields.find((f) => f.id === 'quantity')?.extractedValue || '—'}
                    </p>
                  </div>

                  <div className="p-2 rounded bg-zinc-800/40">
                    <span className="text-[10px] text-zinc-500 uppercase">Destination Site:</span>
                    <p className="font-bold text-zinc-200 text-[11px]">
                      {fields.find((f) => f.id === 'delivery_address')?.extractedValue || '—'}
                    </p>
                  </div>

                  <div className="p-2 rounded bg-zinc-800/40">
                    <span className="text-[10px] text-zinc-500 uppercase">Date & Time Received:</span>
                    <p className="font-bold text-zinc-200">
                      {fields.find((f) => f.id === 'delivery_date')?.extractedValue || '—'}
                    </p>
                  </div>

                  <div className="mt-6 pt-3 border-t border-dashed border-zinc-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase">Consignee Signatory:</span>
                      <p className="font-bold text-emerald-400 text-xs mt-0.5">
                        {fields.find((f) => f.id === 'receiver_signature')?.extractedValue || '—'}
                      </p>
                    </div>
                    <div className="h-10 w-24 rounded border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center text-[10px] font-mono text-emerald-300">
                      [STAMP VERIFIED]
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bounding Box Overlays */}
            {showBoundingBoxes &&
              fields.map((f) => {
                if (!f.boundingBox) return null;
                const [top, left, width, height] = f.boundingBox;
                const isSelected = activeFieldId === f.id;
                const isMatch = f.status === 'MATCH';

                return (
                  <div
                    key={f.id}
                    onClick={() => setActiveFieldId(f.id)}
                    onMouseEnter={() => setActiveFieldId(f.id)}
                    className={cn(
                      'absolute cursor-pointer rounded transition-all duration-200 border-2',
                      isSelected
                        ? 'border-blue-400 bg-blue-500/25 shadow-lg shadow-blue-500/30 scale-[1.02] z-20 animate-pulse'
                        : isMatch
                        ? 'border-emerald-500/60 bg-emerald-500/10 hover:border-blue-400 hover:bg-blue-500/20 z-10'
                        : 'border-red-500/70 bg-red-500/15 hover:border-red-400 hover:bg-red-500/25 z-10'
                    )}
                    style={{
                      top: `${top}%`,
                      left: `${left}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                  >
                    <span
                      className={cn(
                        'absolute -top-4 left-0 rounded px-1 text-[9px] font-mono font-bold tracking-tight',
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : isMatch
                          ? 'bg-zinc-800 text-zinc-300'
                          : 'bg-red-600 text-white'
                      )}
                    >
                      {f.label} ({isMatch ? `${Math.round(f.confidence * 100)}%` : 'MISMATCH'})
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right Pane: Extracted Field Inspector & Action Trigger */}
        <div className="lg:col-span-5 p-5 space-y-4 bg-zinc-900/50 flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Extracted AI Field Assertions
              </p>
              <p className="text-xs text-zinc-500">
                Click any field below to highlight its bounding box on the source image.
              </p>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {fields.map((f) => {
                const Icon = f.icon || FileText;
                const isSelected = activeFieldId === f.id;
                const isMatch = f.status === 'MATCH';

                return (
                  <div
                    key={f.id}
                    onClick={() => setActiveFieldId(isSelected ? null : f.id)}
                    onMouseEnter={() => setActiveFieldId(f.id)}
                    className={cn(
                      'cursor-pointer rounded-xl border p-3 transition-all duration-150',
                      isSelected
                        ? 'border-blue-500/80 bg-blue-950/40 shadow-md ring-1 ring-blue-500/50'
                        : isMatch
                        ? 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/80'
                        : 'border-red-500/40 bg-red-950/20 hover:border-red-500/60'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'p-1.5 rounded-lg',
                            isSelected
                              ? 'bg-blue-500/20 text-blue-400'
                              : isMatch
                              ? 'bg-zinc-800 text-zinc-400'
                              : 'bg-red-500/20 text-red-400'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-200">{f.label}</p>
                          <p className="text-[11px] font-mono text-zinc-400">
                            Confidence: {(f.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          isMatch
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/15 text-red-300 border border-red-500/30'
                        )}
                      >
                        {isMatch ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {f.status}
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] border-t border-zinc-800/80 pt-2 font-mono">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Contract Expectation</span>
                        <span className="text-zinc-300 truncate block">{f.contractValue}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Extracted from Document</span>
                        <span
                          className={cn(
                            'font-semibold truncate block',
                            isMatch ? 'text-blue-300' : 'text-red-400 font-bold'
                          )}
                        >
                          {f.extractedValue}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Field Highlight Note */}
          {activeField && (
            <div
              className={cn(
                'rounded-lg border p-2.5 text-xs flex items-center gap-2',
                activeField.status === 'MATCH'
                  ? 'border-blue-500/30 bg-blue-950/20 text-blue-300'
                  : 'border-red-500/30 bg-red-950/20 text-red-300'
              )}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                Highlighting <strong>{activeField.label}</strong> ({activeField.status}) on document preview.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
