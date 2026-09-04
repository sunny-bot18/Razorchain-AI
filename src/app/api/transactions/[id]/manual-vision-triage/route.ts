import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getUser } from "@/lib/auth";
import { ensureDatabaseInitialized } from "@/lib/db/init-db";
import { findTransactionByIdOrNumber } from "@/lib/db/transaction-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return Response.json(
        { error: "Only administrators can perform Manual Vision Triage" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const transaction = await findTransactionByIdOrNumber(id);

    if (!transaction) {
      return Response.json({ error: "Transaction not found" }, { status: 404 });
    }

    const txUuid = transaction.id;

    const body = await request.json();
    const { decision, notes, itemsVerified, stampVerified } = body;

    if (!decision || !["APPROVE", "FORCE_APPROVE", "REJECT"].includes(decision)) {
      return Response.json(
        { error: "Decision must be APPROVE, FORCE_APPROVE, or REJECT" },
        { status: 400 }
      );
    }

    if (!notes || notes.trim().length < 5) {
      return Response.json(
        { error: "Operations examiner notes are required for audit justification" },
        { status: 400 }
      );
    }

    const isApproved = decision === "APPROVE" || decision === "FORCE_APPROVE";
    const newStatus = isApproved ? "VERIFIED" : "VERIFICATION_FAILED";

    // 1. Update transaction status
    await db
      .update(schema.transactions)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(schema.transactions.id, txUuid));

    // 2. Insert or update verificationResult
    const [existingVr] = await db
      .select()
      .from(schema.verificationResults)
      .where(eq(schema.verificationResults.transactionId, txUuid))
      .limit(1);

    if (existingVr) {
      await db
        .update(schema.verificationResults)
        .set({
          status: isApproved ? "APPROVED" : "REJECTED",
          confidence: isApproved ? 1.0 : 0.0,
          reason: `Manual Vision Triage by Ops: ${notes}`,
          failedChecks: isApproved ? [] : ["manual_triage_rejected"],
          checks: [
            { name: "Physical Delivery Stamp", passed: Boolean(stampVerified ?? true), score: 1.0 },
            { name: "Line-Item Quantity Match", passed: Boolean(itemsVerified ?? true), score: 1.0 },
            { name: "Examiner Certification", passed: isApproved, score: isApproved ? 1.0 : 0.0, details: notes },
          ],
        })
        .where(eq(schema.verificationResults.id, existingVr.id));
    } else {
      await db.insert(schema.verificationResults).values({
        transactionId: txUuid,
        status: isApproved ? "APPROVED" : "REJECTED",
        confidence: isApproved ? 1.0 : 0.0,
        reason: `Manual Vision Triage by Ops: ${notes}`,
        failedChecks: isApproved ? [] : ["manual_triage_rejected"],
        checks: [
          { name: "Physical Delivery Stamp", passed: Boolean(stampVerified ?? true), score: 1.0 },
          { name: "Line-Item Quantity Match", passed: Boolean(itemsVerified ?? true), score: 1.0 },
          { name: "Examiner Certification", passed: isApproved, score: isApproved ? 1.0 : 0.0, details: notes },
        ],
        extractedData: { manualOverride: true, certifiedBy: user.email },
      });
    }

    // 3. Record Immutable Audit Log
    await db.insert(schema.auditLogs).values({
      transactionId: txUuid,
      userId: user.id,
      actor: user.email,
      event: "MANUAL_VISION_OVERRIDE_CERTIFIED",
      action: "MANUAL_VISION_OVERRIDE",
      result: isApproved ? "SUCCESS" : "REJECTED",
      metadata: {
        orderId: txUuid,
        transactionNumber: transaction.transactionNumber,
        decision,
        examinerNotes: notes,
        itemsVerified: Boolean(itemsVerified ?? true),
        stampVerified: Boolean(stampVerified ?? true),
        reason: "Gemini API Outage / Manual Vision Triage Override",
        timestamp: new Date().toISOString(),
      },
    });

    return Response.json({
      success: true,
      transactionStatus: newStatus,
      message: `Manual Vision Triage certified: Order ${transaction.transactionNumber} is now ${newStatus}.`,
    });
  } catch (error) {
    console.error("Manual Vision Triage error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to execute manual vision triage" },
      { status: 500 }
    );
  }
}
