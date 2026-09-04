import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function findTransactionByIdOrNumber(idOrNumber: string) {
  if (!idOrNumber) return null;
  const isIdUuid = isUuid(idOrNumber);
  const [transaction] = await db
    .select()
    .from(schema.transactions)
    .where(isIdUuid ? eq(schema.transactions.id, idOrNumber) : eq(schema.transactions.transactionNumber, idOrNumber))
    .limit(1);
  return transaction || null;
}
