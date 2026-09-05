import { GoogleGenAI, Type } from '@google/genai';
import { env } from '@/lib/config';
import { geminiKeyPool } from '@/lib/services/gemini-key-pool';
import { BaseAgent } from './base-agent';

export interface TransactionInput {
  poNumber: string;
  quantity: number;
  amount: number;
  deliveryAddress: string;
  expectedDeliveryDate: string;
  verificationConditions: string[];
  productDescription: string;
}

export interface ContractData {
  po_number: string;
  required_quantity: number;
  amount: number;
  delivery_address: string;
  expected_delivery_date: string;
  required_checks: string[];
  tolerances: {
    quantity_tolerance_percent: number;
    delivery_date_tolerance_days: number;
  };
}

// ---------------------------------------------------------------------------
// JSON schema enforced natively by the Gemini API — no regex cleaning needed.
// ---------------------------------------------------------------------------

const CONTRACT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    po_number: { type: Type.STRING },
    required_quantity: { type: Type.NUMBER },
    amount: { type: Type.NUMBER },
    delivery_address: { type: Type.STRING },
    expected_delivery_date: { type: Type.STRING },
    required_checks: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    tolerances: {
      type: Type.OBJECT,
      properties: {
        quantity_tolerance_percent: { type: Type.NUMBER },
        delivery_date_tolerance_days: { type: Type.NUMBER },
      },
      propertyOrdering: [
        'quantity_tolerance_percent',
        'delivery_date_tolerance_days',
      ],
    },
  },
  propertyOrdering: [
    'po_number',
    'required_quantity',
    'amount',
    'delivery_address',
    'expected_delivery_date',
    'required_checks',
    'tolerances',
  ],
};

const EXTRACTION_PROMPT = `You are a contract extraction agent. Analyze the given transaction data and extract a structured contract.

Extract the following fields:
- po_number: the purchase order number
- required_quantity: the required product quantity (number)
- amount: the total monetary amount (number)
- delivery_address: the full delivery address
- expected_delivery_date: ISO 8601 date string (YYYY-MM-DD)
- required_checks: an array of verification check names from this fixed list:
  ["po_number_match", "quantity_match", "delivery_address_match", "delivery_date_valid", "signed_delivery_proof"]
- tolerances: an object with:
  - quantity_tolerance_percent: acceptable deviation percentage (default 0)
  - delivery_date_tolerance_days: acceptable late delivery days (default 1)`;

export class ContractAgent extends BaseAgent<TransactionInput, ContractData> {
  name = 'ContractAgent';
  model = 'gemini-3.6-flash';

  private fallbackExtract(input: TransactionInput): ContractData {
    return {
      po_number: input.poNumber,
      required_quantity: input.quantity,
      amount: input.amount,
      delivery_address: input.deliveryAddress,
      expected_delivery_date: input.expectedDeliveryDate,
      required_checks: [
        'po_number_match',
        'quantity_match',
        'delivery_address_match',
        'delivery_date_valid',
        'signed_delivery_proof',
      ],
      tolerances: {
        quantity_tolerance_percent: 0,
        delivery_date_tolerance_days: 1,
      },
    };
  }

  protected async run(input: TransactionInput): Promise<ContractData> {
    if (!geminiKeyPool.isConfigured()) {
      return this.fallbackExtract(input);
    }

    try {
      return await geminiKeyPool.executeWithRotation(async (_apiKey, ai) => {
        const transactionSummary = [
          `PO Number: ${input.poNumber}`,
          `Quantity: ${input.quantity}`,
          `Amount: ${input.amount}`,
          `Delivery Address: ${input.deliveryAddress}`,
          `Expected Delivery Date: ${input.expectedDeliveryDate}`,
          `Product Description: ${input.productDescription || ''}`,
          `Verification Conditions: ${(input.verificationConditions || []).join(', ')}`,
        ].join('\n');

        const result = await ai.models.generateContent({
          model: this.model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: EXTRACTION_PROMPT },
                { text: `\n\nTransaction Data:\n${transactionSummary}` },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: CONTRACT_RESPONSE_SCHEMA,
          },
        });

        return JSON.parse(result.text ?? '{}') as ContractData;
      });
    } catch (apiError) {
      console.warn(
        '[ContractAgent] Gemini API failed across key pool, using fallback extraction:',
        apiError instanceof Error ? apiError.message : apiError,
      );
      return this.fallbackExtract(input);
    }
  }

  protected getConfidence(output: ContractData | null): number {
    if (!output) return 0;
    // Confidence is set during execute based on whether AI parsing or fallback was used.
    // Since we can't easily distinguish here (the fallback runs inside `run` which
    // returns the same type), we default to 0.95 — the caller can override if needed.
    return 0.95;
  }
}

/**
 * Execute contract extraction with explicit confidence tracking.
 * Returns both the result and whether fallback was used.
 */
export async function extractContract(
  input: TransactionInput,
): Promise<{ contract: ContractData; usedFallback: boolean }> {
  const agent = new ContractAgent();
  const apiKey = env.GOOGLE_API_KEY ?? process.env.GOOGLE_API_KEY;
  const geminiConfigured =
    typeof apiKey === 'string' && apiKey.length >= 10 && !apiKey.includes('...');

  if (!geminiConfigured) {
    // No API key — always fallback
    return {
      contract: {
        po_number: input.poNumber,
        required_quantity: input.quantity,
        amount: input.amount,
        delivery_address: input.deliveryAddress,
        expected_delivery_date: input.expectedDeliveryDate,
        required_checks: [
          'po_number_match',
          'quantity_match',
          'delivery_address_match',
          'delivery_date_valid',
          'signed_delivery_proof',
        ],
        tolerances: {
          quantity_tolerance_percent: 0,
          delivery_date_tolerance_days: 1,
        },
      },
      usedFallback: true,
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const transactionSummary = [
    `PO Number: ${input.poNumber}`,
    `Quantity: ${input.quantity}`,
    `Amount: ${input.amount}`,
    `Delivery Address: ${input.deliveryAddress}`,
    `Expected Delivery Date: ${input.expectedDeliveryDate}`,
    `Product Description: ${input.productDescription}`,
    `Verification Conditions: ${input.verificationConditions.join(', ')}`,
  ].join('\n');

  let usedFallback = false;
  let contract: ContractData;

  try {
    const result = await ai.models.generateContent({
      model: agent.model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: EXTRACTION_PROMPT },
            { text: `\n\nTransaction Data:\n${transactionSummary}` },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: CONTRACT_RESPONSE_SCHEMA,
      },
    });

    contract = JSON.parse(result.text ?? '{}') as ContractData;
  } catch {
    usedFallback = true;
    contract = {
      po_number: input.poNumber,
      required_quantity: input.quantity,
      amount: input.amount,
      delivery_address: input.deliveryAddress,
      expected_delivery_date: input.expectedDeliveryDate,
      required_checks: [
        'po_number_match',
        'quantity_match',
        'delivery_address_match',
        'delivery_date_valid',
        'signed_delivery_proof',
      ],
      tolerances: {
        quantity_tolerance_percent: 0,
        delivery_date_tolerance_days: 1,
      },
    };
  }

  return { contract, usedFallback };
}
