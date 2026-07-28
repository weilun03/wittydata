import { db } from "@/lib/db";

export async function listGenders() {
  return db
    .selectFrom("gender")
    .selectAll()
    .where("deactivated_at", "is", null)
    .orderBy("id")
    .execute();
}

export async function listPricingRegions() {
  return db
    .selectFrom("rate_set_support_item_pricing_region")
    .selectAll()
    .where("deactivated_at", "is", null)
    .orderBy("code")
    .execute();
}
