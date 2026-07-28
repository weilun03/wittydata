import { Kysely, PostgresDialect } from "kysely";
import { Pool, types } from "pg";
import type { Database } from "@/lib/data-access/types";

// Postgres `date` OID (1082): return the raw "YYYY-MM-DD" string instead of
// node-postgres's default JS Date conversion, which shifts by timezone.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});
