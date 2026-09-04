export interface OrderResult {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

export interface PaymentResult {
  id: string;
  amount: number;
  currency: string;
  /** 'authorized' | 'captured' | 'failed' | 'refunded' */
  status: string;
  order_id: string;
  method?: string;
  captured: boolean;
}

export interface PaymentProvider {
  createOrder(params: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<OrderResult>;

  fetchOrder(orderId: string): Promise<OrderResult>;

  capturePayment(
    paymentId: string,
    amount: number,
    currency: string,
  ): Promise<PaymentResult>;

  fetchPayment(paymentId: string): Promise<PaymentResult>;

  verifyWebhookSignature(
    body: string,
    signature: string,
    secret: string,
  ): boolean;
}
