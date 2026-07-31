import { sql, type Insertable, type Updateable } from "kysely";
import { db } from "@/lib/db";
import type { ClientTable } from "@/db/types";

const activeClients = () => db.selectFrom("client").where("deleted_at", "is", null);

export async function findActiveClientsByNdisNumber(ndisNumber: string) {
  return activeClients().selectAll().where("ndis_number", "=", ndisNumber).execute();
}

export async function searchActiveClientsByNameTokens(tokens: string[]) {
  if (tokens.length === 0) return [];
  return activeClients()
    .selectAll()
    .where(sql<boolean>`name_parts && ${tokens}::text[]`)
    .execute();
}

export async function listClients({ limit, offset }: { limit: number; offset: number }) {
  const [rows, totalRow] = await Promise.all([
    activeClients().selectAll().orderBy("id", "desc").limit(limit).offset(offset).execute(),
    activeClients()
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
  ]);

  return { rows, total: Number(totalRow.count) };
}

export async function getClientById(id: number) {
  return activeClients().selectAll().where("id", "=", id).executeTakeFirst();
}

export async function findClientByNdisNumber(ndisNumber: string, excludeId?: number) {
  let query = activeClients().selectAll().where("ndis_number", "=", ndisNumber);
  if (excludeId != null) {
    query = query.where("id", "!=", excludeId);
  }
  return query.executeTakeFirst();
}

export async function insertClient(values: Insertable<ClientTable>) {
  return db.insertInto("client").values(values).returningAll().executeTakeFirstOrThrow();
}

export async function updateClient(id: number, values: Updateable<ClientTable>) {
  return db
    .updateTable("client")
    .set({ ...values, updated_at: sql`now()` })
    .where("id", "=", id)
    .where("deleted_at", "is", null)
    .returningAll()
    .executeTakeFirst();
}

export async function deleteClient(id: number) {
  return db
    .updateTable("client")
    .set({ deleted_at: sql`now()` })
    .where("id", "=", id)
    .where("deleted_at", "is", null)
    .returningAll()
    .executeTakeFirst();
}
