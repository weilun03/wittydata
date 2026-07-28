import { sql, type Insertable, type Updateable } from "kysely";
import { db } from "@/lib/data-access/db";
import type { ProviderTable } from "@/lib/data-access/types";

const activeProviders = () => db.selectFrom("provider").where("deleted_at", "is", null);

export async function listProviders({ limit, offset }: { limit: number; offset: number }) {
  const [rows, totalRow] = await Promise.all([
    activeProviders().selectAll().orderBy("id", "desc").limit(limit).offset(offset).execute(),
    activeProviders()
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
  ]);

  return { rows, total: Number(totalRow.count) };
}

export async function getProviderById(id: number) {
  return activeProviders().selectAll().where("id", "=", id).executeTakeFirst();
}

export async function insertProvider(values: Insertable<ProviderTable>) {
  return db.insertInto("provider").values(values).returningAll().executeTakeFirstOrThrow();
}

export async function updateProvider(id: number, values: Updateable<ProviderTable>) {
  return db
    .updateTable("provider")
    .set({ ...values, updated_at: sql`now()` })
    .where("id", "=", id)
    .where("deleted_at", "is", null)
    .returningAll()
    .executeTakeFirst();
}
