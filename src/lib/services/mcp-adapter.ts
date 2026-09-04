/**
 * MCP (Model Context Protocol) adapter interface for Razorpay integration.
 *
 * This module provides a local adapter that maps MCP tool calls to
 * PaymentService methods. In production this can be replaced with the
 * real razorpay-mcp-server via the MCP protocol.
 */
import { PaymentService } from "@/lib/services/payment-service";

export interface MCPAdapter {
  callTool(toolName: string, params: Record<string, unknown>): Promise<unknown>;
  listTools(): Promise<string[]>;
}

const TOOL_MAP: Record<
  string,
  (service: PaymentService, params: Record<string, unknown>) => Promise<unknown>
> = {
  create_order: (service, params) =>
    service.reservePayment(
      params.transactionId as string,
      params.amount as number,
      params.idempotencyKey as string,
    ),

  capture_payment: (service, params) =>
    service.capturePayment(
      params.paymentId as string,
      params.amount as number,
      params.idempotencyKey as string,
    ),

  fetch_payment: (service, params) =>
    service.getPaymentStatus(params.paymentId as string),
};

export class LocalMCPAdapter implements MCPAdapter {
  private service: PaymentService;

  constructor(service?: PaymentService) {
    this.service = service ?? new PaymentService();
  }

  async callTool(
    toolName: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const handler = TOOL_MAP[toolName];
    if (!handler) {
      throw new Error(`Unknown MCP tool: ${toolName}`);
    }
    return handler(this.service, params);
  }

  async listTools(): Promise<string[]> {
    return Object.keys(TOOL_MAP);
  }
}
