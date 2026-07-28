import { sql, type Insertable, type Updateable } from "kysely";
import { db } from "@/lib/db";
import type { RateSetTable } from "@/db/types";

const activeRateSets = () => db.selectFrom("rate_set").where("deleted_at", "is", null);

export async function listRateSets({ limit, offset }: { limit: number; offset: number }) {
  const [rows, totalRow] = await Promise.all([
    activeRateSets().selectAll().orderBy("start_date", "desc").limit(limit).offset(offset).execute(),
    activeRateSets()
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
  ]);

  return { rows, total: Number(totalRow.count) };
}

export async function getRateSetById(id: number) {
  return activeRateSets().selectAll().where("id", "=", id).executeTakeFirst();
}

export async function insertRateSet(values: Insertable<RateSetTable>) {
  return db.insertInto("rate_set").values(values).returningAll().executeTakeFirstOrThrow();
}

export async function updateRateSet(id: number, values: Updateable<RateSetTable>) {
  return db
    .updateTable("rate_set")
    .set({ ...values, updated_at: sql`now()` })
    .where("id", "=", id)
    .where("deleted_at", "is", null)
    .returningAll()
    .executeTakeFirst();
}
