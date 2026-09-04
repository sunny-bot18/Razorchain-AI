import { createHmac } from 'crypto';
import { eq, or, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';

export type WebhookEvent =
  | 'PO_CREATED'
  | 'PO_RESERVED'
  | 'VERIFICATION_STARTED'
  | 'VERIFICATION_PASSED'
  | 'VERIFICATION_FAILED'
  | 'PAYMENT_SETTLED'
  | 'MILESTONE_SETTLED'
  | 'AUTO_RELEASED'
  | 'AUTO_REFUNDED'
  | 'MANUAL_REVIEW_TRIGGERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface WebhookPayload {
  event: WebhookEvent;
  transactionId: string;
  transactionNumber?: string;
  timestamp: string;
  data: Record<string, unknown>;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // ms

async function deliverWithRetry(
  url: string,
  body: string,
  signature: string,
  attempt = 0,
): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RazorChain-Signature': signature,
        'X-RazorChain-Event': JSON.parse(body).event as string,
        'User-Agent': 'RazorChain-Webhook/1.0',
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    if (attempt < MAX_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      return deliverWithRetry(url, body, signature, attempt + 1);
    }
    console.error(`[WebhookService] Failed to deliver to ${url} after ${MAX_RETRIES} attempts:`, err);
  }
}

/**
 * Dispatch a webhook event to all active endpoints registered by
 * the transaction's buyer or seller.
 */
export async function dispatchWebhook(
  transactionId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
  ownerIds: string[],
): Promise<void> {
  if (ownerIds.length === 0) return;

  // Get transaction number for payload
  const [tx] = await db
    .select({ transactionNumber: schema.transactions.transactionNumber })
    .from(schema.transactions)
    .where(eq(schema.transactions.id, transactionId))
    .limit(1);

  const webhookPayload: WebhookPayload = {
    event,
    transactionId,
    transactionNumber: tx?.transactionNumber,
    timestamp: new Date().toISOString(),
    data: payload,
  };

  const body = JSON.stringify(webhookPayload);

  // Find active endpoints for these owners that subscribe to this event
  const endpoints = await db
    .select()
    .from(schema.webhookEndpoints)
    .where(
      and(
        eq(schema.webhookEndpoints.active, true),
        or(...ownerIds.map((id) => eq(schema.webhookEndpoints.ownerId, id))),
      )
    );

  const relevant = endpoints.filter(
    (ep) => ep.events.length === 0 || ep.events.includes(event),
  );

  for (const ep of relevant) {
    const signature = createHmac('sha256', ep.secret).update(body).digest('hex');
    // Fire-and-forget with retry
    void deliverWithRetry(ep.url, body, signature);
  }
}
