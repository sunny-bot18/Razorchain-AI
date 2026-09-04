import { type NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getUser } from "@/lib/auth";
import { PaymentService } from "@/lib/services/payment-service";
import { createHash } from "crypto";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return Response.json({ error: "Only administrators can view settlement batch queues" }, { status: 403 });
    }

    const queuedTransactions = await db
      .select({
        id: schema.transactions.id,
        transactionNumber: schema.transactions.transactionNumber,
        amount: schema.transactions.amount,
        status: schema.transactions.status,
        productDescription: schema.transactions.productDescription,
        createdAt: schema.transactions.createdAt,
        updatedAt: schema.transactions.updatedAt,
      })
      .from(schema.transactions)
      .where(eq(schema.transactions.status, "SETTLEMENT_QUEUED"));

    const totalQueuedAmount = queuedTransactions.reduce((sum, t) => sum + t.amount, 0);

    return Response.json({
      queuedCount: queuedTransactions.length,
      totalQueuedAmount,
      queuedTransactions,
    });
  } catch (error) {
    console.error("Settlement Batch GET error:", error);
    return Response.json({ error: "Failed to fetch queued batch" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return Response.json(
        { error: "Only administrators can trigger batch settlement execution" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { orderIds, batchWindow } = body;

    let targetTransactions;
    if (Array.isArray(orderIds) && orderIds.length > 0) {
      targetTransactions = await db
        .select()
        .from(schema.transactions)
        .where(inArray(schema.transactions.id, orderIds));
    } else {
      targetTransactions = await db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.status, "SETTLEMENT_QUEUED"));
    }

    if (targetTransactions.length === 0) {
      return Response.json({
        message: "No orders currently pending in the settlement queue.",
        processedCount: 0,
        settledTransactions: [],
      });
    }

    const processedResults = [];

    for (const tx of targetTransactions) {
      // Deterministic Idempotency Key
      const idempotencyKey = `batch-settle-${tx.id}-${createHash("sha256").update(tx.id + tx.amount).digest("hex").slice(0, 10)}`;

      // Check if execution already logged
      const [existingExecution] = await db
        .select()
        .from(schema.paymentExecutions)
        .where(eq(schema.paymentExecutions.transactionId, tx.id))
        .limit(1);

      if (existingExecution && existingExecution.status === "SUCCESS") {
        processedResults.push({
          id: tx.id,
          transactionNumber: tx.transactionNumber,
          status: "ALREADY_SETTLED",
          idempotencyKey,
        });
        continue;
      }

      // Execute simulated Razorpay/RBI payout
      const paymentService = new PaymentService();
      const captureResult = await paymentService.capturePayment(
        `pay_batch_${tx.id.slice(0, 8)}`,
        tx.amount,
        idempotencyKey
      );

      // Record / Update paymentExecution with Idempotency Key
      if (existingExecution) {
        await db
          .update(schema.paymentExecutions)
          .set({
            status: "SUCCESS",
            executedAt: new Date(),
            razorpayResponse: {
              ...captureResult,
              idempotencyKey,
              batchWindow: batchWindow || "NEXT_IMMEDIATE_CYCLE",
              batchExecutedBy: user.email,
            },
          })
          .where(eq(schema.paymentExecutions.id, existingExecution.id));
      } else {
        await db.insert(schema.paymentExecutions).values({
          transactionId: tx.id,
          idempotencyKey,
          action: "BATCH_CAPTURE_DISBURSE",
          amount: tx.amount,
          status: "SUCCESS",
          executedAt: new Date(),
          razorpayResponse: {
            ...captureResult,
            idempotencyKey,
            batchWindow: batchWindow || "NEXT_IMMEDIATE_CYCLE",
            batchExecutedBy: user.email,
          },
        });
      }

      // Transition transaction state to SETTLED
      await db
        .update(schema.transactions)
        .set({
          status: "SETTLED",
          updatedAt: new Date(),
        })
        .where(eq(schema.transactions.id, tx.id));

      // Record Immutable Audit Log
      await db.insert(schema.auditLogs).values({
        transactionId: tx.id,
        userId: user.id,
        actor: user.email,
        event: "BATCH_SETTLEMENT_EXECUTED",
        action: "EXECUTE_BATCH_CLEARING",
        result: "SUCCESS",
        metadata: {
          orderId: tx.id,
          transactionNumber: tx.transactionNumber,
          amount: tx.amount,
          idempotencyKey,
          batchWindow: batchWindow || "NEXT_IMMEDIATE_CYCLE",
          clearingCycle: "RBI_NEFT_RTGS_WINDOW",
          timestamp: new Date().toISOString(),
        },
      });

      processedResults.push({
        id: tx.id,
        transactionNumber: tx.transactionNumber,
        amount: tx.amount,
        status: "SETTLED",
        idempotencyKey,
      });
    }

    return Response.json({
      success: true,
      processedCount: processedResults.length,
      settledTransactions: processedResults,
      message: `Successfully executed batch settlement for ${processedResults.length} transaction(s).`,
    });
  } catch (error) {
    console.error("Settlement Batch POST error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to process settlement batch" },
      { status: 500 }
    );
  }
}
