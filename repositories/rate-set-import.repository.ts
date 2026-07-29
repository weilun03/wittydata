import { sql, type Insertable, type Kysely, type Updateable } from "kysely";
import type { Database } from "@/db/types";

type DbOrTrx = Kysely<Database>;

const CHUNK_SIZE = 500;

export async function listCategoriesForRateSet(trx: DbOrTrx, rateSetId: number) {
  return trx
    .selectFrom("rate_set_category")
    .selectAll()
    .where("rate_set_id", "=", rateSetId)
    .execute();
}

export async function insertCategory(
  trx: DbOrTrx,
  values: Insertable<Database["rate_set_category"]>,
) {
  return trx.insertInto("rate_set_category").values(values).returningAll().executeTakeFirstOrThrow();
}

export async function updateCategory(
  trx: DbOrTrx,
  id: number,
  values: Updateable<Database["rate_set_category"]>,
) {
  return trx
    .updateTable("rate_set_category")
    .set({ ...values, updated_at: sql`now()` })
    .where("id", "=", id)
    .execute();
}

export async function listSupportItemsForRateSet(trx: DbOrTrx, rateSetId: number) {
  return trx
    .selectFrom("rate_set_support_item")
    .selectAll()
    .where("rate_set_id", "=", rateSetId)
    .execute();
}

export async function insertSupportItem(
  trx: DbOrTrx,
  values: Insertable<Database["rate_set_support_item"]>,
) {
  return trx
    .insertInto("rate_set_support_item")
    .values(values)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateSupportItem(
  trx: DbOrTrx,
  id: number,
  values: Updateable<Database["rate_set_support_item"]>,
) {
  return trx
    .updateTable("rate_set_support_item")
    .set({ ...values, updated_at: sql`now()` })
    .where("id", "=", id)
    .execute();
}

export async function listAttributesForSupportItems(trx: DbOrTrx, supportItemIds: number[]) {
  if (supportItemIds.length === 0) return [];
  return trx
    .selectFrom("rate_set_support_item_attribute")
    .selectAll()
    .where("support_item_id", "in", supportItemIds)
    .execute();
}

export async function insertAttributes(
  trx: DbOrTrx,
  rows: Insertable<Database["rate_set_support_item_attribute"]>[],
) {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await trx.insertInto("rate_set_support_item_attribute").values(chunk).execute();
  }
}

export async function updateAttribute(trx: DbOrTrx, id: number, value: boolean) {
  return trx
    .updateTable("rate_set_support_item_attribute")
    .set({ value })
    .where("id", "=", id)
    .execute();
}

export async function upsertAttributeType(trx: DbOrTrx, code: string, label: string) {
  await trx
    .insertInto("rate_set_support_item_attribute_type")
    .values({ code, label })
    .onConflict((oc) => oc.column("code").doUpdateSet({ label }))
    .execute();
}

export async function upsertPricingRegion(
  trx: DbOrTrx,
  code: string,
  label: string,
  fullLabel: string,
) {
  await trx
    .insertInto("rate_set_support_item_pricing_region")
    .values({ code, label, full_label: fullLabel })
    .onConflict((oc) => oc.column("code").doUpdateSet({ label, full_label: fullLabel }))
    .execute();
}

export async function upsertSupportItemType(trx: DbOrTrx, code: string, label: string) {
  await trx
    .insertInto("rate_set_support_item_type")
    .values({ code, label })
    .onConflict((oc) => oc.column("code").doUpdateSet({ label }))
    .execute();
}

export async function getSupportItemTypeIdsByCode(trx: DbOrTrx, codes: string[]) {
  if (codes.length === 0) return new Map<string, number>();
  const rows = await trx
    .selectFrom("rate_set_support_item_type")
    .select(["id", "code"])
    .where("code", "in", codes)
    .execute();
  return new Map(rows.map((r) => [r.code, r.id]));
}

export async function listPricesForRateSet(trx: DbOrTrx, rateSetId: number) {
  return trx
    .selectFrom("rate_set_support_item_price")
    .selectAll()
    .where("rate_set_id", "=", rateSetId)
    .execute();
}

export async function insertPrices(
  trx: DbOrTrx,
  rows: Insertable<Database["rate_set_support_item_price"]>[],
) {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await trx.insertInto("rate_set_support_item_price").values(chunk).execute();
  }
}

export async function updatePriceAmount(trx: DbOrTrx, id: number, unitPrice: string) {
  return trx
    .updateTable("rate_set_support_item_price")
    .set({ unit_price: unitPrice, updated_at: sql`now()` })
    .where("id", "=", id)
    .execute();
}

export async function deletePrices(trx: DbOrTrx, ids: number[]) {
  if (ids.length === 0) return;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    await trx.deleteFrom("rate_set_support_item_price").where("id", "in", chunk).execute();
  }
}
