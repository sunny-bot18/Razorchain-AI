import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __db_pool: Pool | undefined;
}

const pool =
  globalThis.__db_pool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 30,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__db_pool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
