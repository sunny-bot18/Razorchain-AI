import { GoogleGenAI, Type } from '@google/genai';
import { env } from '@/lib/config';
import { geminiKeyPool } from '@/lib/services/gemini-key-pool';
import { BaseAgent } from './base-agent';

export interface DocumentInput {
  filePath: string;
  fileName: string;
  fileType: string;
  buffer?: Buffer;
}

export interface ExtractedField {
  po_number: string | null;
  quantity: number | null;
  delivery_address: string | null;
  delivery_date: string | null;
  recipient: string | null;
  total_amount: number | null;
}

export interface DocumentExtraction {
  fileName: string;
  document_type:
    | 'invoice'
    | 'delivery_receipt'
    | 'shipping_manifest'
    | 'purchase_order'
    | 'photograph'
    | 'other';
  fields: ExtractedField;
  signature_detected: boolean;
  confidence: number;
  anomalies: string[];
  raw_text_excerpt: string;
}

export interface VisionOutput {
  documents: DocumentExtraction[];
  overall_confidence: number;
  missing_fields: string[];
  inconsistencies: string[];
  execution_mode?: 'LIVE_GEMINI' | 'DEMO_FALLBACK';
  model_used?: string;
  key_used?: string;
}

// ---------------------------------------------------------------------------
// JSON schema enforced natively by the Gemini API.
// The model is guaranteed to return text that matches this schema exactly —
// no regex cleaning or JSON.parse try/catch required.
// ---------------------------------------------------------------------------

const VISION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    documents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          fileName: { type: Type.STRING },
          document_type: {
            type: Type.STRING,
            enum: [
              'invoice',
              'delivery_receipt',
              'shipping_manifest',
              'purchase_order',
              'photograph',
              'other',
            ],
          },
          fields: {
            type: Type.OBJECT,
            properties: {
              po_number: { type: Type.STRING, nullable: true },
              quantity: { type: Type.NUMBER, nullable: true },
              delivery_address: { type: Type.STRING, nullable: true },
              delivery_date: { type: Type.STRING, nullable: true },
              recipient: { type: Type.STRING, nullable: true },
              total_amount: { type: Type.NUMBER, nullable: true },
            },
            propertyOrdering: [
              'po_number',
              'quantity',
              'delivery_address',
              'delivery_date',
              'recipient',
              'total_amount',
            ],
          },
          signature_detected: { type: Type.BOOLEAN },
          confidence: { type: Type.NUMBER },
          anomalies: { type: Type.ARRAY, items: { type: Type.STRING } },
          raw_text_excerpt: { type: Type.STRING },
        },
        propertyOrdering: [
          'fileName',
          'document_type',
          'fields',
          'signature_detected',
          'confidence',
          'anomalies',
          'raw_text_excerpt',
        ],
      },
    },
    overall_confidence: { type: Type.NUMBER },
    missing_fields: { type: Type.ARRAY, items: { type: Type.STRING } },
    inconsistencies: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  propertyOrdering: [
    'documents',
    'overall_confidence',
    'missing_fields',
    'inconsistencies',
  ],
};

const VISION_PROMPT = `You are a document analysis agent with vision capabilities. Analyze the provided documents and extract structured information.

For each document, determine:
- The document type (invoice, delivery_receipt, shipping_manifest, purchase_order, photograph, or other)
- Key fields: po_number, quantity, delivery_address, delivery_date, recipient, total_amount
- Whether a signature is detected
- Your confidence in the extraction (0.0 to 1.0)
- Any anomalies or suspicious elements
- A brief text excerpt from the document

Also provide:
- overall_confidence: average confidence across all documents
- missing_fields: fields that should be present but are missing across documents
- inconsistencies: contradictions between documents (e.g., different PO numbers, mismatched amounts)`;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PDF_TYPES = ['application/pdf'];

function mimeTypeFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

export class VisionAgent extends BaseAgent<DocumentInput[], VisionOutput> {
  name = 'VisionAgent';
  model = 'gemini-2.5-flash';

  protected async run(input: DocumentInput[]): Promise<VisionOutput> {
    if (!geminiKeyPool.isConfigured()) {
      console.info('[VisionAgent] No Gemini API key configured in pool. Using deterministic demo extraction.');
      const demoResult = this.extractDemoText(input);
      demoResult.execution_mode = 'DEMO_FALLBACK';
      demoResult.model_used = 'demo-fallback-heuristic';
      return demoResult;
    }

    try {
      return await geminiKeyPool.executeWithRotation(async (apiKey, ai) => {
        const masked = `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
        console.info(`[VisionAgent] 🔍 Sending image to Google Gemini API (${this.model}) with key ${masked}...`);

        // Build parts array for multimodal input using the new SDK's content format.
        type ContentPart =
          | { text: string }
          | { inlineData: { mimeType: string; data: string } };

        const parts: ContentPart[] = [{ text: VISION_PROMPT }];

        for (const doc of input) {
          const mimeType = mimeTypeFromFileName(doc.fileName);

          if (
            doc.buffer &&
            (IMAGE_TYPES.includes(mimeType) || PDF_TYPES.includes(mimeType))
          ) {
            // Send as inline data for images and PDFs
            parts.push({
              inlineData: {
                mimeType,
                data: doc.buffer.toString('base64'),
              },
            });
          } else {
            // For non-binary or missing buffer, send as text
            try {
              if (doc.buffer) {
                const textContent = doc.buffer.toString('utf-8');
                parts.push({
                  text: `[Document: ${doc.fileName}]\n${textContent}`,
                });
              } else {
                parts.push({
                  text: `[Document: ${doc.fileName} (${mimeType})] - No data available for analysis`,
                });
              }
            } catch {
              parts.push({
                text: `[Document: ${doc.fileName}] - Could not read file contents`,
              });
            }
          }
        }

        if (parts.length <= 1) {
          // Only the prompt text was added — no actual document parts
          return {
            documents: [],
            overall_confidence: 0,
            missing_fields: [],
            inconsistencies: [],
            execution_mode: 'LIVE_GEMINI',
            model_used: this.model,
            key_used: masked,
          };
        }

        // Native JSON mode: response.text is guaranteed to match VISION_RESPONSE_SCHEMA.
        const result = await ai.models.generateContent({
          model: this.model,
          contents: [{ role: 'user', parts }],
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: VISION_RESPONSE_SCHEMA,
          },
        });

        const parsed = JSON.parse(result.text ?? '{}') as VisionOutput;
        parsed.execution_mode = 'LIVE_GEMINI';
        parsed.model_used = this.model;
        parsed.key_used = masked;
        console.info(`[VisionAgent] ✓ Google Gemini API returned analysis with confidence: ${parsed.overall_confidence}`);
        return parsed;
      });
    } catch (apiError) {
      // API key invalid or network error — fall back to demo text extraction.
      console.warn(
        '[VisionAgent] Gemini API call failed across key pool, falling back to demo text extraction:',
        apiError instanceof Error ? apiError.message : apiError,
      );
      const demoResult = this.extractDemoText(input);
      demoResult.execution_mode = 'DEMO_FALLBACK';
      demoResult.model_used = 'demo-fallback-after-error';
      return demoResult;
    }
  }

  protected getConfidence(output: VisionOutput | null): number {
    if (!output) return 0;
    return output.overall_confidence;
  }

  /**
   * Demo fallback path — used when no Gemini API key is configured.
   *
   * For plain-text files the existing regex parser runs as before.
   * For binary files (JPEG, PNG, PDF, WEBP) we cannot parse the bytes as
   * UTF-8, so we return a realistic synthetic extraction built from whatever
   * fields we can find in the other uploaded documents or sensible defaults.
   * This lets the full pipeline run end-to-end in demo mode with image uploads.
   */
  private extractDemoText(input: DocumentInput[]): VisionOutput {
    // ── helpers ────────────────────────────────────────────────────────────
    const isTextFile = (doc: DocumentInput) => {
      const mime = doc.fileType?.toLowerCase() ?? '';
      const name = doc.fileName?.toLowerCase() ?? '';
      return (
        mime.startsWith('text/') ||
        name.endsWith('.txt') ||
        name.endsWith('.csv') ||
        name.endsWith('.md')
      );
    };

    // ── first pass: extract what we can from any plain-text documents ──────
    const extractFromText = (doc: DocumentInput) => {
      const text = doc.buffer?.toString('utf8') ?? '';
      const value = (pattern: RegExp) => text.match(pattern)?.[1]?.trim() ?? null;
      const numberValue = (pattern: RegExp) => {
        const raw = value(pattern);
        return raw ? Number(raw.replace(/,/g, '')) : null;
      };
      return { text, value, numberValue };
    };

    // Gather any structured hints from text-based docs so the synthetic
    // extraction for images stays consistent.
    let hintPoNumber: string | null = null;
    let hintQuantity: number | null = null;
    let hintAddress: string | null = null;
    let hintDate: string | null = null;
    let hintAmount: number | null = null;

    for (const doc of input) {
      if (!isTextFile(doc)) continue;
      const { text, value, numberValue } = extractFromText(doc);
      if (!text) continue;
      hintPoNumber ??= value(/(?:po(?:\s*(?:number|no\.?))?)\s*[:#-]\s*(PO-[A-Z0-9-]+)/i);
      hintQuantity ??= numberValue(/(?:quantity|units?)\s*[:#-]\s*([\d,]+)/i);
      hintAddress ??= value(/(?:delivery address|address)\s*[:#-]\s*([^\n]+)/i);
      hintDate ??= value(/(?:delivery date|date)\s*[:#-]\s*([\d]{4}-[\d]{2}-[\d]{2})/i);
      hintAmount ??= numberValue(/(?:total amount|amount)\s*[:₹#-]\s*([\d,]+)/i);
    }

    // ── second pass: build per-document extractions ─────────────────────────
    const documents = input.map((doc) => {
      if (isTextFile(doc)) {
        // ── original text path (unchanged) ──────────────────────────────
        const { text, value, numberValue } = extractFromText(doc);
        const type = /delivery receipt/i.test(text)
          ? ('delivery_receipt' as const)
          : /manifest/i.test(text)
            ? ('shipping_manifest' as const)
            : /invoice/i.test(text)
              ? ('invoice' as const)
              : ('other' as const);
        const signature =
          /signature\s*(?:detected|present|:)?\s*(?:yes|present|signed|true)/i.test(text) ||
          /signature\s*:\s*\[?signed/i.test(text) ||
          /signed by/i.test(text);
        return {
          fileName: doc.fileName,
          document_type: type,
          fields: {
            po_number: value(
              /(?:purchase order|reference(?:\s+po)?|po(?:\s*(?:number|no\.))?)\s*[:#-]\s*(PO-[A-Z0-9-]+)/i,
            ),
            quantity: numberValue(/(?:quantity|units?)\s*[:#-]\s*([\d,]+)/i),
            delivery_address: value(/(?:delivery address|address)\s*[:#-]\s*([^\n]+)/i),
            delivery_date: value(/(?:delivery date|date)\s*[:#-]\s*([\d]{4}-[\d]{2}-[\d]{2})/i),
            recipient: value(/(?:recipient|delivered to)\s*[:#-]\s*([^\n]+)/i),
            total_amount: numberValue(/(?:total amount|amount)\s*[:₹#-]\s*([\d,]+)/i),
          },
          signature_detected: signature,
          confidence: text ? 0.98 : 0,
          anomalies: [],
          raw_text_excerpt: text.slice(0, 4000),
        };
      }

      // ── binary / image / PDF path: synthetic but realistic extraction ────
      // We infer the document type from the filename so the delivery_receipt
      // label is set correctly and signature_detected returns true (demo
      // images are assumed to be signed delivery proofs).
      const name = doc.fileName.toLowerCase();
      const type = name.includes('invoice')
        ? ('invoice' as const)
        : name.includes('manifest')
          ? ('shipping_manifest' as const)
          : name.includes('purchase') || name.includes('po')
            ? ('purchase_order' as const)
            : name.match(/\.(jpe?g|png|webp)$/)
              ? ('photograph' as const)
              : ('delivery_receipt' as const);

      // Use text-doc hints when available, otherwise fall back to the demo
      // defaults that match the seeded RC-DEMO-1045 transaction.
      const syntheticExcerpt = [
        'DELIVERY RECEIPT',
        `Reference PO: ${hintPoNumber ?? 'PO-2026-1045'}`,
        `Quantity: ${hintQuantity ?? 500} units`,
        `Delivery Address: ${hintAddress ?? 'Bengaluru'}`,
        `Delivery Date: ${hintDate ?? new Date().toISOString().slice(0, 10)}`,
        'Signature: [Signed]',
        `Amount: ${hintAmount ?? 10000}`,
        '',
        '[Note: This is a simulated extraction for demo mode.',
        ' In production, Gemini Vision reads the actual image.]',
      ].join('\n');

      return {
        fileName: doc.fileName,
        document_type: type,
        fields: {
          po_number: hintPoNumber ?? 'PO-2026-1045',
          quantity: hintQuantity ?? 500,
          delivery_address: hintAddress ?? 'Bengaluru',
          delivery_date: hintDate ?? new Date().toISOString().slice(0, 10),
          recipient: null,
          total_amount: hintAmount ?? 10000,
        },
        // Images in demo mode are treated as signed delivery proofs.
        signature_detected: true,
        // Lower confidence than a real API call to signal it's simulated.
        confidence: 0.72,
        anomalies: ['[Demo mode] Image analyzed via simulated extraction — real API not configured'],
        raw_text_excerpt: syntheticExcerpt,
      };
    });

    const overallConfidence = documents.length
      ? documents.reduce((sum, doc) => sum + doc.confidence, 0) / documents.length
      : 0;

    return {
      documents,
      overall_confidence: overallConfidence,
      missing_fields: [],
      inconsistencies: [],
    };
  }
}
