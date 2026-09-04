import crypto from "node:crypto";
import Razorpay from "razorpay";
import type {
  OrderResult,
  PaymentProvider,
  PaymentResult,
} from "@/lib/services/payment-provider";
import { env } from "@/lib/config";

function getClient(): Razorpay {
  // env.isRazorpayConfigured is checked by PaymentService before this provider
  // is ever instantiated, so these values are guaranteed to be defined here.
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID!,
    key_secret: env.RAZORPAY_KEY_SECRET!,
  });
}

function baseUrl(): string {
  return "https://api.razorpay.com/v1";
}

function authHeader(): string {
  return (
    "Basic " +
    Buffer.from(`${env.RAZORPAY_KEY_ID!}:${env.RAZORPAY_KEY_SECRET!}`).toString("base64")
  );
}

export class RazorpayProvider implements PaymentProvider {
  async createOrder(params: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<OrderResult> {
    const client = getClient();
    const result = await client.orders.create({
      amount: Math.round(params.amount * 100), // convert to paise
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
    });

    return {
      id: result.id,
      amount: Number(result.amount) / 100, // back to rupees
      currency: result.currency,
      receipt: result.receipt ?? params.receipt,
      status: result.status,
      created_at: Number(result.created_at),
    };
  }

  async fetchOrder(orderId: string): Promise<OrderResult> {
    const client = getClient();
    const result = await client.orders.fetch(orderId);

    return {
      id: result.id,
      amount: Number(result.amount) / 100,
      currency: result.currency,
      receipt: result.receipt ?? "",
      status: result.status,
      created_at: Number(result.created_at),
    };
  }

  async capturePayment(
    paymentId: string,
    amount: number,
    currency: string,
  ): Promise<PaymentResult> {
    const response = await fetch(
      `${baseUrl()}/payments/${paymentId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to capture payment: ${error}`);
    }

    const data = (await response.json()) as Record<string, unknown>;

    return {
      id: data.id as string,
      amount: (data.amount as number) / 100,
      currency: data.currency as string,
      status: data.status as string,
      order_id: data.order_id as string,
      method: data.method as string | undefined,
      captured: data.captured as boolean,
    };
  }

  async fetchPayment(paymentId: string): Promise<PaymentResult> {
    const client = getClient();
    const result = await client.payments.fetch(paymentId);

    return {
      id: result.id,
      amount: Number(result.amount) / 100,
      currency: result.currency,
      status: result.status,
      order_id: result.order_id,
      method: result.method as string | undefined,
      captured: result.captured,
    };
  }

  verifyWebhookSignature(
    body: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    return expectedSignature === signature;
  }
}
