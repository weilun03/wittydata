import { db } from "@/lib/db";
import { getRateSetById } from "@/repositories/rate-set.repository";
import * as importRepo from "@/repositories/rate-set-import.repository";
import { parseWorkbook } from "@/modules/rate-set-import/parse";
import { PRICING_REGION_FULL_LABELS } from "@/modules/rate-set-import/constants";
import type { RateSetImportSummary } from "@/modules/rate-set-import/types";
import { recordAuditLog, type ActorContext } from "@/lib/audit";

export class RateSetImportNotFoundError extends Error {
  constructor() {
    super("Rate set not found.");
    this.name = "RateSetImportNotFoundError";
  }
}

export class RateSetImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateSetImportValidationError";
  }
}

function isoOrEmpty(value: Date | string | null): string {
  if (value == null) return "";
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function importRateSetExcel(
  rateSetId: number,
  buffer: Buffer,
  actor: ActorContext,
): Promise<RateSetImportSummary> {
  const rateSet = await getRateSetById(rateSetId);
  if (!rateSet) {
    throw new RateSetImportNotFoundError();
  }

  const parsed = parseWorkbook(buffer);
  if (parsed.sheetsProcessed.length === 0) {
    throw new RateSetImportValidationError(
      "No worksheet matched the expected NDIS Support Catalogue layout (a sheet with 'Support Item Number' in cell A1).",
    );
  }

  const summary = await db.transaction().execute(async (trx) => {
    // --- Global lookups: pricing regions, attribute types, support item types ---
    for (const region of parsed.pricingRegions) {
      await importRepo.upsertPricingRegion(
        trx,
        region.code,
        region.label,
        PRICING_REGION_FULL_LABELS[region.code] ?? region.label,
      );
    }
    for (const attrType of parsed.attributeTypes) {
      await importRepo.upsertAttributeType(trx, attrType.code, attrType.label);
    }
    for (const type of parsed.types) {
      await importRepo.upsertSupportItemType(trx, type.code, type.label);
    }
    const typeIdByCode = await importRepo.getSupportItemTypeIdsByCode(
      trx,
      parsed.types.map((t) => t.code),
    );

    // --- Categories: unique by category_number, sorted numerically ---
    const existingCategories = await importRepo.listCategoriesForRateSet(trx, rateSetId);
    const existingCategoryByNumber = new Map(existingCategories.map((c) => [c.category_number, c]));

    const sortedCategories = [...parsed.categories].sort(
      (a, b) => Number(a.categoryNumber) - Number(b.categoryNumber),
    );

    const categorySummary = { inserted: 0, updated: 0, deactivated: 0, unchanged: 0 };
    const categoryIdByNumber = new Map<string, number>();
    const seenCategoryNumbers = new Set<string>();

    for (const [index, category] of sortedCategories.entries()) {
      const sorting = index + 1;
      seenCategoryNumbers.add(category.categoryNumber);
      const existing = existingCategoryByNumber.get(category.categoryNumber);

      if (!existing) {
        const inserted = await importRepo.insertCategory(trx, {
          rate_set_id: rateSetId,
          category_number: category.categoryNumber,
          category_name: category.categoryName,
          sorting,
        });
        categoryIdByNumber.set(category.categoryNumber, inserted.id);
        categorySummary.inserted++;
        continue;
      }

      categoryIdByNumber.set(category.categoryNumber, existing.id);
      const needsUpdate =
        existing.category_name !== category.categoryName ||
        existing.sorting !== sorting ||
        existing.deactivated_at !== null ||
        existing.deleted_at !== null;

      if (needsUpdate) {
        await importRepo.updateCategory(trx, existing.id, {
          category_name: category.categoryName,
          sorting,
          deactivated_at: null,
          deleted_at: null,
        });
        categorySummary.updated++;
      } else {
        categorySummary.unchanged++;
      }
    }

    for (const existing of existingCategories) {
      if (!seenCategoryNumbers.has(existing.category_number) && existing.deactivated_at === null) {
        await importRepo.updateCategory(trx, existing.id, { deactivated_at: new Date() });
        categorySummary.deactivated++;
      }
    }

    // --- Support items: unique by (category, item_number), sorted by first appearance ---
    const existingSupportItems = await importRepo.listSupportItemsForRateSet(trx, rateSetId);
    const existingSupportItemByKey = new Map(
      existingSupportItems.map((si) => [`${si.category_id}|${si.item_number}`, si]),
    );

    const sortedSupportItems = [...parsed.supportItems].sort(
      (a, b) => a.firstSeenOrder - b.firstSeenOrder,
    );

    const supportItemSummary = { inserted: 0, updated: 0, deactivated: 0, unchanged: 0 };
    const supportItemIdByBusinessKey = new Map<string, number>();
    const seenSupportItemDbKeys = new Set<string>();

    for (const [index, item] of sortedSupportItems.entries()) {
      const sorting = index + 1;
      const categoryId = categoryIdByNumber.get(item.categoryNumber);
      if (categoryId == null) continue; // unreachable: every item's category was just processed above

      const dbKey = `${categoryId}|${item.itemNumber}`;
      const businessKey = `${item.categoryNumber}|${item.itemNumber}`;
      seenSupportItemDbKeys.add(dbKey);
      const existing = existingSupportItemByKey.get(dbKey);

      if (!existing) {
        const inserted = await importRepo.insertSupportItem(trx, {
          rate_set_id: rateSetId,
          category_id: categoryId,
          item_number: item.itemNumber,
          item_name: item.itemName,
          unit: item.unit,
          sorting,
        });
        supportItemIdByBusinessKey.set(businessKey, inserted.id);
        supportItemSummary.inserted++;
        continue;
      }

      supportItemIdByBusinessKey.set(businessKey, existing.id);
      const needsUpdate =
        existing.item_name !== item.itemName ||
        existing.unit !== item.unit ||
        existing.sorting !== sorting ||
        existing.deactivated_at !== null ||
        existing.deleted_at !== null;

      if (needsUpdate) {
        await importRepo.updateSupportItem(trx, existing.id, {
          item_name: item.itemName,
          unit: item.unit,
          sorting,
          deactivated_at: null,
          deleted_at: null,
        });
        supportItemSummary.updated++;
      } else {
        supportItemSummary.unchanged++;
      }
    }

    for (const existing of existingSupportItems) {
      const dbKey = `${existing.category_id}|${existing.item_number}`;
      if (!seenSupportItemDbKeys.has(dbKey) && existing.deactivated_at === null) {
        await importRepo.updateSupportItem(trx, existing.id, { deactivated_at: new Date() });
        supportItemSummary.deactivated++;
      }
    }

    // --- Attributes: boolean flags per support item, upserted (no soft-delete concept here) ---
    const touchedSupportItemIds = [...supportItemIdByBusinessKey.values()];
    const existingAttributes = await importRepo.listAttributesForSupportItems(
      trx,
      touchedSupportItemIds,
    );
    const existingAttributeByKey = new Map(
      existingAttributes.map((a) => [`${a.support_item_id}|${a.attribute_code}`, a]),
    );

    const newAttributeRows: {
      support_item_id: number;
      attribute_code: string;
      value: boolean;
    }[] = [];

    for (const item of parsed.supportItems) {
      const businessKey = `${item.categoryNumber}|${item.itemNumber}`;
      const supportItemId = supportItemIdByBusinessKey.get(businessKey);
      if (supportItemId == null) continue;

      for (const [attributeCode, value] of Object.entries(item.attributes)) {
        const existing = existingAttributeByKey.get(`${supportItemId}|${attributeCode}`);
        if (!existing) {
          newAttributeRows.push({ support_item_id: supportItemId, attribute_code: attributeCode, value });
        } else if (existing.value !== value) {
          await importRepo.updateAttribute(trx, existing.id, value);
        }
      }
    }
    await importRepo.insertAttributes(trx, newAttributeRows);

    // --- Prices: business key is (support_item, type, region, start_date, end_date). ---
    // No deactivated_at/deleted_at column exists on this table, so a price line
    // missing from the re-import is hard-deleted rather than soft-deleted.
    const existingPrices = await importRepo.listPricesForRateSet(trx, rateSetId);
    const existingPriceByKey = new Map(
      existingPrices.map((p) => [
        [p.support_item_id, p.type_id ?? "", p.pricing_region_code ?? "", isoOrEmpty(p.start_date), isoOrEmpty(p.end_date)].join(
          "|",
        ),
        p,
      ]),
    );

    const priceSummary = { inserted: 0, updated: 0, deleted: 0, unchanged: 0 };
    const newPriceRows: {
      rate_set_id: number;
      support_item_id: number;
      type_id: number | null;
      pricing_region_code: string;
      unit_price: string;
      start_date: string;
      end_date: string | null;
    }[] = [];
    const matchedExistingIds = new Set<number>();

    for (const price of parsed.prices) {
      const businessKey = `${price.categoryNumber}|${price.itemNumber}`;
      const supportItemId = supportItemIdByBusinessKey.get(businessKey);
      if (supportItemId == null) continue;
      const typeId = price.typeCode ? (typeIdByCode.get(price.typeCode) ?? null) : null;
      const endDate = price.endDate || null;

      const key = [supportItemId, typeId ?? "", price.regionCode, price.startDate, endDate ?? ""].join("|");
      const existing = existingPriceByKey.get(key);

      if (!existing) {
        newPriceRows.push({
          rate_set_id: rateSetId,
          support_item_id: supportItemId,
          type_id: typeId,
          pricing_region_code: price.regionCode,
          unit_price: price.unitPrice,
          start_date: price.startDate,
          end_date: endDate,
        });
        priceSummary.inserted++;
        continue;
      }

      matchedExistingIds.add(existing.id);
      if (Number(existing.unit_price) !== Number(price.unitPrice)) {
        await importRepo.updatePriceAmount(trx, existing.id, price.unitPrice);
        priceSummary.updated++;
      } else {
        priceSummary.unchanged++;
      }
    }

    await importRepo.insertPrices(trx, newPriceRows);

    const idsToDelete = existingPrices
      .filter((p) => !matchedExistingIds.has(p.id))
      .map((p) => p.id);
    await importRepo.deletePrices(trx, idsToDelete);
    priceSummary.deleted = idsToDelete.length;

    return {
      sheetsProcessed: parsed.sheetsProcessed,
      sheetsSkipped: parsed.sheetsSkipped,
      rowsProcessed: parsed.rowsProcessed,
      categories: categorySummary,
      supportItems: supportItemSummary,
      prices: priceSummary,
      warnings: parsed.warnings,
    };
  });

  // One audit entry for the whole import rather than one per touched row (an import can
  // touch hundreds of category/support-item/price rows across four tables) — the summary
  // counts already capture what changed.
  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "update",
    entity: "rate_set_import",
    entityId: rateSetId,
    after: {
      categories: summary.categories,
      supportItems: summary.supportItems,
      prices: summary.prices,
      sheetsProcessed: summary.sheetsProcessed,
      sheetsSkipped: summary.sheetsSkipped,
    },
  });

  return summary;
}
