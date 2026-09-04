import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const [transaction] = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, id))
      .limit(1);

    if (!transaction) {
      return Response.json({ error: "Transaction not found" }, { status: 404 });
    }

    const body = await request.json();
    const { decision, notes, itemsVerified, stampVerified } = body;

    if (!decision || !["APPROVE", "REJECT"].includes(decision)) {
      return Response.json(
        { error: "Decision must be APPROVE or REJECT" },
        { status: 400 }
      );
    }

    if (!notes || notes.trim().length < 5) {
      return Response.json(
        { error: "Operations examiner notes are required for audit justification" },
        { status: 400 }
      );
    }

    const newStatus = decision === "APPROVE" ? "VERIFIED" : "VERIFICATION_FAILED";

    // 1. Update transaction status
    await db
      .update(schema.transactions)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(schema.transactions.id, id));

    // 2. Insert or update verificationResult
    const [existingVr] = await db
      .select()
      .from(schema.verificationResults)
      .where(eq(schema.verificationResults.transactionId, id))
      .limit(1);

    if (existingVr) {
      await db
        .update(schema.verificationResults)
        .set({
          status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
          confidence: decision === "APPROVE" ? 1.0 : 0.0,
          reason: `Manual Vision Triage by Ops: ${notes}`,
          failedChecks: decision === "APPROVE" ? [] : ["manual_triage_rejected"],
          checks: [
            { name: "Physical Delivery Stamp", passed: Boolean(stampVerified ?? true), score: 1.0 },
            { name: "Line-Item Quantity Match", passed: Boolean(itemsVerified ?? true), score: 1.0 },
            { name: "Examiner Certification", passed: decision === "APPROVE", score: decision === "APPROVE" ? 1.0 : 0.0, details: notes },
          ],
        })
        .where(eq(schema.verificationResults.id, existingVr.id));
    } else {
      await db.insert(schema.verificationResults).values({
        transactionId: id,
        status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
        confidence: decision === "APPROVE" ? 1.0 : 0.0,
        reason: `Manual Vision Triage by Ops: ${notes}`,
        failedChecks: decision === "APPROVE" ? [] : ["manual_triage_rejected"],
        checks: [
          { name: "Physical Delivery Stamp", passed: Boolean(stampVerified ?? true), score: 1.0 },
          { name: "Line-Item Quantity Match", passed: Boolean(itemsVerified ?? true), score: 1.0 },
          { name: "Examiner Certification", passed: decision === "APPROVE", score: decision === "APPROVE" ? 1.0 : 0.0, details: notes },
        ],
        extractedData: { manualOverride: true, certifiedBy: user.email },
      });
    }

    // 3. Record Immutable Audit Log
    await db.insert(schema.auditLogs).values({
      transactionId: id,
      userId: user.id,
      actor: user.email,
      event: "MANUAL_VISION_OVERRIDE_CERTIFIED",
      action: "MANUAL_VISION_OVERRIDE",
      result: decision === "APPROVE" ? "SUCCESS" : "REJECTED",
      metadata: {
        orderId: id,
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
