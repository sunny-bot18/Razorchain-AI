import type { PaymentResult } from "@/lib/services/payment-provider";
import { RazorpayProvider } from "@/lib/services/razorpay-provider";
import { MockPaymentProvider } from "@/lib/services/mock-payment-provider";
import { env } from "@/lib/config";

export interface PaymentReservation {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
}

function createProvider(): RazorpayProvider | MockPaymentProvider {
  // Demo mode is intentionally the default. Live/Test Razorpay calls are an
  // explicit opt-in so placeholder credentials can never break the demo or
  // accidentally trigger an external request.
  // env.isRazorpayConfigured checks RAZORCHAIN_PAYMENT_PROVIDER === 'razorpay'
  // AND that both key_id and key_secret are present and non-placeholder.
  if (env.isRazorpayConfigured) {
    return new RazorpayProvider();
  }
  return new MockPaymentProvider();
}

export class PaymentService {
  private provider = createProvider();
  private processedKeys = new Map<string, PaymentReservation | PaymentResult>();

  getProvider(): "razorpay" | "mock" {
    return this.provider instanceof RazorpayProvider ? "razorpay" : "mock";
  }

  /**
   * Reserve funds by creating an order. Returns the reservation details
   * including a payment ID that can later be captured.
   */
  async reservePayment(
    transactionId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<PaymentReservation> {
    const cached = this.processedKeys.get(idempotencyKey);
    if (cached) {
      return cached as PaymentReservation;
    }

    const order = await this.provider.createOrder({
      amount,
      currency: "INR",
      receipt: transactionId,
      notes: { transaction_id: transactionId },
    });

    const reservation: PaymentReservation = {
      orderId: order.id,
      // The mock provider creates an authorized payment at order creation. Real
      // Razorpay checkout supplies this after the buyer authorizes the order.
      paymentId: this.provider instanceof MockPaymentProvider
        ? this.provider.getPaymentIdForOrder(order.id) || ""
        : "",
      amount: order.amount,
      currency: order.currency,
      status: this.getProvider() === "mock" ? "authorized" : order.status,
    };

    this.processedKeys.set(idempotencyKey, reservation);
    return reservation;
  }

  /**
   * Capture a previously authorized payment. Idempotent — repeating the
   * same key returns the original result.
   */
  async capturePayment(
    paymentId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<PaymentResult> {
    const cached = this.processedKeys.get(idempotencyKey);
    if (cached) {
      return cached as PaymentResult;
    }

    const result = await this.provider.capturePayment(
      paymentId,
      amount,
      "INR",
    );

    this.processedKeys.set(idempotencyKey, result);
    return result;
  }

  /**
   * Fetch the current status of a payment.
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    return this.provider.fetchPayment(paymentId);
  }

  /**
   * Verify a Razorpay webhook signature.
   */
  verifyWebhookSignature(
    body: string,
    signature: string,
    secret: string,
  ): boolean {
    return this.provider.verifyWebhookSignature(body, signature, secret);
  }
}
