import * as XLSX from "xlsx";
import {
  ATTRIBUTE_COLUMNS,
  COL,
  EXPECTED_HEADER_A1,
  PRICING_REGION_COLUMNS_END,
  PRICING_REGION_COLUMNS_START,
} from "@/modules/rate-set-import/constants";
import type {
  ParsedCategory,
  ParsedPrice,
  ParsedSupportItem,
  ParsedWorkbook,
} from "@/modules/rate-set-import/types";

type Row = unknown[];

function normalizeCode(text: string): string {
  return text.trim().toUpperCase().replace(/\s+/g, "_");
}

function isBlankCell(value: unknown): boolean {
  return value == null || (typeof value === "string" && value.trim() === "");
}

function isTruthyFlag(value: unknown): boolean {
  if (value == null) return false;
  const s = String(value).trim().toLowerCase();
  return s === "yes" || s === "y";
}

// Column K/L values are the literal digits "YYYYMMDD" (as a number or a
// string) — not an Excel date serial. e.g. 20250701, "20250701", "99991231"
// (the NDIS sentinel for "no defined end date" — imported literally, not
// treated as null, per the import logic's plain "populate end_date" wording).
function parseNdisDateParts(raw: unknown): { y: number; m: number; d: number } | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!/^\d{8}$/.test(s)) return null;
  return {
    y: Number(s.slice(0, 4)),
    m: Number(s.slice(4, 6)),
    d: Number(s.slice(6, 8)),
  };
}

function toUtcStartOfDay(raw: unknown): string | null {
  const parts = parseNdisDateParts(raw);
  if (!parts) return null;
  const mm = String(parts.m).padStart(2, "0");
  const dd = String(parts.d).padStart(2, "0");
  return `${parts.y}-${mm}-${dd}T00:00:00.000Z`;
}

function toUtcEndOfDay(raw: unknown): string | null {
  const parts = parseNdisDateParts(raw);
  if (!parts) return null;
  const mm = String(parts.m).padStart(2, "0");
  const dd = String(parts.d).padStart(2, "0");
  return `${parts.y}-${mm}-${dd}T23:59:59.999Z`;
}

function sheetLooksLikeCatalogue(rows: Row[]): boolean {
  const header = rows[0];
  return !!header && String(header[COL.ITEM_NUMBER] ?? "").trim() === EXPECTED_HEADER_A1;
}

export function parseWorkbook(buffer: Buffer): ParsedWorkbook {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const warnings: string[] = [];
  const sheetsProcessed: string[] = [];
  const sheetsSkipped: string[] = [];
  let rowsProcessed = 0;

  const categories = new Map<string, ParsedCategory>();
  const supportItems = new Map<string, ParsedSupportItem>();
  const prices = new Map<string, ParsedPrice>();
  const typeLabels = new Map<string, string>();
  let pricingRegionHeaders: { code: string; label: string }[] | null = null;
  let attributeTypeHeaders: { code: string; label: string }[] | null = null;
  let supportItemOrderCounter = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet["!ref"]) {
      sheetsSkipped.push(sheetName);
      continue;
    }

    const rows = XLSX.utils.sheet_to_json<Row>(worksheet, { header: 1, defval: null });
    if (!sheetLooksLikeCatalogue(rows)) {
      sheetsSkipped.push(sheetName);
      continue;
    }
    sheetsProcessed.push(sheetName);

    const header = rows[0];

    if (!pricingRegionHeaders) {
      pricingRegionHeaders = [];
      for (let c = PRICING_REGION_COLUMNS_START; c <= PRICING_REGION_COLUMNS_END; c++) {
        const label = String(header[c] ?? "").trim();
        if (!label) continue;
        pricingRegionHeaders.push({ code: normalizeCode(label), label });
      }
    }

    if (!attributeTypeHeaders) {
      attributeTypeHeaders = ATTRIBUTE_COLUMNS.map(({ column, code }) => ({
        code,
        label: String(header[column] ?? code).trim(),
      }));
    }

    const dataRows = rows.slice(1);
    for (const row of dataRows) {
      const itemNumber = row[COL.ITEM_NUMBER];
      if (isBlankCell(itemNumber)) continue;

      const categoryNumber = String(row[COL.CATEGORY_NUMBER] ?? "").trim();
      const categoryName = String(row[COL.CATEGORY_NAME] ?? "").trim();
      const itemNumberStr = String(itemNumber).trim();
      const itemName = String(row[COL.ITEM_NAME] ?? "").trim();
      const unitRaw = row[COL.UNIT];
      const unit = isBlankCell(unitRaw) ? null : String(unitRaw).trim();

      if (!categoryNumber || !categoryName) {
        warnings.push(`Skipped row for item ${itemNumberStr}: missing category number/name.`);
        continue;
      }

      rowsProcessed++;

      if (!categories.has(categoryNumber)) {
        categories.set(categoryNumber, { categoryNumber, categoryName });
      }

      const itemKey = `${categoryNumber}|${itemNumberStr}`;
      if (!supportItems.has(itemKey)) {
        const attributes: Record<string, boolean> = {};
        for (const { column, code } of ATTRIBUTE_COLUMNS) {
          attributes[code] = isTruthyFlag(row[column]);
        }
        supportItems.set(itemKey, {
          categoryNumber,
          itemNumber: itemNumberStr,
          itemName,
          unit,
          attributes,
          firstSeenOrder: supportItemOrderCounter++,
        });
      }

      const startDate = toUtcStartOfDay(row[COL.START_DATE]);
      const endDate = toUtcEndOfDay(row[COL.END_DATE]);
      if (!startDate) {
        warnings.push(`Skipped price row for item ${itemNumberStr}: invalid/missing start date.`);
        continue;
      }

      const typeRaw = row[COL.TYPE];
      let typeCode: string | null = null;
      let typeLabel: string | null = null;
      if (!isBlankCell(typeRaw)) {
        typeLabel = String(typeRaw).trim();
        typeCode = normalizeCode(typeLabel);
        if (!typeLabels.has(typeCode)) {
          typeLabels.set(typeCode, typeLabel);
        }
      }

      for (let c = PRICING_REGION_COLUMNS_START; c <= PRICING_REGION_COLUMNS_END; c++) {
        const label = String(header[c] ?? "").trim();
        if (!label) continue;
        const regionCode = normalizeCode(label);
        const cellValue = row[c];
        if (isBlankCell(cellValue)) continue;
        const numericValue = typeof cellValue === "number" ? cellValue : Number(cellValue);
        if (Number.isNaN(numericValue)) {
          warnings.push(
            `Skipped price for item ${itemNumberStr} region ${regionCode}: non-numeric value "${String(cellValue)}".`,
          );
          continue;
        }

        const priceKey = [categoryNumber, itemNumberStr, typeCode ?? "", regionCode, startDate, endDate ?? ""].join(
          "|",
        );
        prices.set(priceKey, {
          categoryNumber,
          itemNumber: itemNumberStr,
          typeCode,
          typeLabel,
          regionCode,
          unitPrice: numericValue.toFixed(4),
          startDate,
          endDate: endDate ?? "",
        });
      }
    }
  }

  if (sheetsProcessed.length === 0) {
    warnings.push("No worksheet matched the expected NDIS Support Catalogue layout.");
  }

  return {
    categories: [...categories.values()],
    supportItems: [...supportItems.values()],
    prices: [...prices.values()],
    pricingRegions: pricingRegionHeaders ?? [],
    attributeTypes: attributeTypeHeaders ?? [],
    types: [...typeLabels.entries()].map(([code, label]) => ({ code, label })),
    warnings,
    sheetsProcessed,
    sheetsSkipped,
    rowsProcessed,
  };
}
