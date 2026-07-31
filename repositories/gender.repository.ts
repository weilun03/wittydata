import { sql, type Insertable, type Updateable } from "kysely";
import { db } from "@/lib/db";
import type { GenderTable } from "@/db/types";

// Unlike client/provider/rate_set/invoice/app_user, gender has no deleted_at column —
// it's reference data, not a primary record, so "delete" here means deactivate. The
// admin management view (unlike the active-only dropdown lookup in lookup.repository.ts)
// intentionally shows deactivated rows too, so they can be reactivated.
export async function listGendersPaged({ limit, offset }: { limit: number; offset: number }) {
  const [rows, totalRow] = await Promise.all([
    db.selectFrom("gender").selectAll().orderBy("id", "asc").limit(limit).offset(offset).execute(),
    db
      .selectFrom("gender")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
  ]);

  return { rows, total: Number(totalRow.count) };
}

export async function getGenderById(id: number) {
  return db.selectFrom("gender").selectAll().where("id", "=", id).executeTakeFirst();
}

export async function findGenderByCode(code: string, excludeId?: number) {
  let query = db.selectFrom("gender").selectAll().where("code", "=", code);
  if (excludeId != null) {
    query = query.where("id", "!=", excludeId);
  }
  return query.executeTakeFirst();
}

export async function insertGender(values: Insertable<GenderTable>) {
  return db.insertInto("gender").values(values).returningAll().executeTakeFirstOrThrow();
}

export async function updateGender(id: number, values: Updateable<GenderTable>) {
  return db
    .updateTable("gender")
    .set({ ...values, updated_at: sql`now()` })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function deactivateGender(id: number) {
  return db
    .updateTable("gender")
    .set({ deactivated_at: sql`now()` })
    .where("id", "=", id)
    .where("deactivated_at", "is", null)
    .returningAll()
    .executeTakeFirst();
}

export async function reactivateGender(id: number) {
  return db
    .updateTable("gender")
    .set({ deactivated_at: null, updated_at: sql`now()` })
    .where("id", "=", id)
    .where("deactivated_at", "is not", null)
    .returningAll()
    .executeTakeFirst();
}
