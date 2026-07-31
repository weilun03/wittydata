import { sql, type Kysely } from "kysely";
import { db } from "@/lib/db";
import type { Database } from "@/db/types";

type DbOrTrx = Kysely<Database>;

// A rate set is considered matching an item's date range if:
// rate_set.start_date <= item.end_date AND (rate_set.end_date IS NULL OR rate_set.end_date >= item.start_date)
export async function findRateSetsOverlapping(
  startDate: string,
  endDate: string,
  trx: DbOrTrx = db,
) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return trx
    .selectFrom("rate_set")
    .selectAll()
    .where("deleted_at", "is", null)
    .where("start_date", "<=", end)
    .where((eb) => eb.or([eb("end_date", "is", null), eb("end_date", ">=", start)]))
    .execute();
}

// Ranked: latest start_date, then latest finite end_date, then highest id.
export async function findBestPrice(
  params: {
    rateSetId: number;
    supportItemId: number;
    regionCode: string;
    startDate: string;
    endDate: string;
  },
  trx: DbOrTrx = db,
) {
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);
  return trx
    .selectFrom("rate_set_support_item_price")
    .selectAll()
    .where("rate_set_id", "=", params.rateSetId)
    .where("support_item_id", "=", params.supportItemId)
    .where("pricing_region_code", "=", params.regionCode)
    .where("start_date", "<=", end)
    .where((eb) => eb.or([eb("end_date", "is", null), eb("end_date", ">=", start)]))
    .orderBy("start_date", "desc")
    .orderBy(sql`end_date desc nulls last`)
    .orderBy("id", "desc")
    .limit(1)
    .executeTakeFirst();
}

export async function listCategoriesForRateSet(rateSetId: number, trx: DbOrTrx = db) {
  return trx
    .selectFrom("rate_set_category")
    .select(["id", "category_number", "category_name"])
    .where("rate_set_id", "=", rateSetId)
    .where("deleted_at", "is", null)
    .where("deactivated_at", "is", null)
    .orderBy("sorting", "asc")
    .execute();
}

export async function listSupportItemsForCategory(categoryId: number, trx: DbOrTrx = db) {
  return trx
    .selectFrom("rate_set_support_item")
    .select(["id", "item_number", "item_name", "unit"])
    .where("category_id", "=", categoryId)
    .where("deleted_at", "is", null)
    .where("deactivated_at", "is", null)
    .orderBy("sorting", "asc")
    .execute();
}

export async function getCategoryById(id: number, trx: DbOrTrx = db) {
  return trx.selectFrom("rate_set_category").selectAll().where("id", "=", id).executeTakeFirst();
}

export async function getSupportItemById(id: number, trx: DbOrTrx = db) {
  return trx
    .selectFrom("rate_set_support_item")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

// Filtered to a single rate set (already matched), since item_number is only
// unique per rate_set_id + category_id + item_number, not globally.
export async function findSupportItemsByItemNumber(
  rateSetId: number,
  itemNumber: string,
  trx: DbOrTrx = db,
) {
  return trx
    .selectFrom("rate_set_support_item")
    .selectAll()
    .where("rate_set_id", "=", rateSetId)
    .where("item_number", "=", itemNumber)
    .where("deleted_at", "is", null)
    .execute();
}

export async function getClientPricingRegion(clientId: number, trx: DbOrTrx = db) {
  const row = await trx
    .selectFrom("client")
    .select(["pricing_region"])
    .where("id", "=", clientId)
    .where("deleted_at", "is", null)
    .executeTakeFirst();
  return row?.pricing_region ?? null;
}
