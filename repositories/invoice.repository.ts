import type { Insertable, Kysely, Updateable } from "kysely";
import { sql } from "kysely";
import { db } from "@/lib/db";
import type { Database } from "@/db/types";

type DbOrTrx = Kysely<Database>;

const activeInvoices = (trx: DbOrTrx = db) =>
  trx.selectFrom("invoice").where("invoice.deleted_at", "is", null);

export async function listInvoices({ limit, offset }: { limit: number; offset: number }) {
  const [rows, totalRow] = await Promise.all([
    activeInvoices()
      .leftJoin("client", "client.id", "invoice.client_id")
      .leftJoin("provider", "provider.id", "invoice.provider_id")
      .select([
        "invoice.id",
        "invoice.client_id",
        "invoice.provider_id",
        "invoice.invoice_number",
        "invoice.invoice_date",
        "invoice.amount",
        "invoice.expected_amount",
        "invoice.status",
        "client.first_name as client_first_name",
        "client.last_name as client_last_name",
        "provider.name as provider_name",
      ])
      .orderBy("invoice.id", "desc")
      .limit(limit)
      .offset(offset)
      .execute(),
    activeInvoices()
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
  ]);

  return { rows, total: Number(totalRow.count) };
}

export async function getInvoiceById(id: number, trx: DbOrTrx = db) {
  return activeInvoices(trx).selectAll().where("id", "=", id).executeTakeFirst();
}

export async function getInvoiceItemsByInvoiceId(invoiceId: number, trx: DbOrTrx = db) {
  return trx
    .selectFrom("invoice_item")
    .selectAll()
    .where("invoice_id", "=", invoiceId)
    .where("deleted_at", "is", null)
    .orderBy("sort_order", "asc")
    .orderBy("id", "asc")
    .execute();
}

export async function insertInvoice(trx: DbOrTrx, values: Insertable<Database["invoice"]>) {
  return trx.insertInto("invoice").values(values).returningAll().executeTakeFirstOrThrow();
}

export async function updateInvoice(
  trx: DbOrTrx,
  id: number,
  values: Updateable<Database["invoice"]>,
) {
  return trx
    .updateTable("invoice")
    .set({ ...values, updated_at: sql`now()` })
    .where("id", "=", id)
    .where("deleted_at", "is", null)
    .returningAll()
    .executeTakeFirst();
}

export async function softDeleteAllItemsForInvoice(trx: DbOrTrx, invoiceId: number) {
  return trx
    .updateTable("invoice_item")
    .set({ deleted_at: new Date() })
    .where("invoice_id", "=", invoiceId)
    .where("deleted_at", "is", null)
    .execute();
}

export async function insertInvoiceItems(
  trx: DbOrTrx,
  rows: Insertable<Database["invoice_item"]>[],
) {
  if (rows.length === 0) return [];
  return trx.insertInto("invoice_item").values(rows).returningAll().execute();
}
