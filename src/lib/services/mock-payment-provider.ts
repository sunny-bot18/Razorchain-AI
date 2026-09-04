import type {
  OrderResult,
  PaymentProvider,
  PaymentResult,
} from "@/lib/services/payment-provider";

let counter = 0;

function mockId(prefix: string): string {
  counter++;
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${rand}${String(counter).padStart(3, "0")}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock payment provider for demo mode.
 * Simulates the full Razorpay authorize → capture flow without
 * hitting any real API. Useful for local development and testing.
 */
export class MockPaymentProvider implements PaymentProvider {
  private orders = new Map<string, OrderResult>();
  private payments = new Map<string, PaymentResult>();

  getPaymentIdForOrder(orderId: string): string | undefined {
    return [...this.payments.values()].find((payment) => payment.order_id === orderId)?.id;
  }

  async createOrder(params: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<OrderResult> {
    const id = mockId("order_mock");

    const order: OrderResult = {
      id,
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      status: "created",
      created_at: Math.floor(Date.now() / 1000),
    };

    this.orders.set(id, order);

    // Simulate an authorized payment attached to the order
    const paymentId = mockId("pay_mock");
    const payment: PaymentResult = {
      id: paymentId,
      amount: params.amount,
      currency: params.currency,
      status: "authorized",
      order_id: id,
      method: "card",
      captured: false,
    };

    this.payments.set(paymentId, payment);

    return order;
  }

  async fetchOrder(orderId: string): Promise<OrderResult> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    return order;
  }

  async capturePayment(
    paymentId: string,
    amount: number,
    currency: string,
  ): Promise<PaymentResult> {
    // Simulate network latency
    await delay(500);

    let payment = this.payments.get(paymentId);
    if (!payment) {
      // Payment not found in memory — this happens after a server restart when the
      // DB has a stored payment ID but the in-memory map was cleared.
      // Synthesize a captured result so the demo settle flow works across restarts.
      payment = {
        id: paymentId,
        amount,
        currency,
        status: "captured",
        order_id: `order_mock_recovered`,
        method: "card",
        captured: true,
      };
      this.payments.set(paymentId, payment);
      return payment;
    }

    payment.status = "captured";
    payment.amount = amount;
    payment.currency = currency;
    payment.captured = true;

    return payment;
  }

  async fetchPayment(paymentId: string): Promise<PaymentResult> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }
    return payment;
  }

  verifyWebhookSignature(
    _body: string,
    _signature: string,
    _secret: string,
  ): boolean {
    void _body;
    void _signature;
    void _secret;
    return true;
  }
}
