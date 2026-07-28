export interface ParsedCategory {
  categoryNumber: string;
  categoryName: string;
}

export interface ParsedSupportItem {
  categoryNumber: string;
  itemNumber: string;
  itemName: string;
  unit: string | null;
  attributes: Record<string, boolean>;
  firstSeenOrder: number;
}

export interface ParsedPrice {
  categoryNumber: string;
  itemNumber: string;
  typeCode: string | null;
  typeLabel: string | null;
  regionCode: string;
  unitPrice: string;
  startDate: string;
  endDate: string;
}

export interface ParsedPricingRegion {
  code: string;
  label: string;
}

export interface ParsedAttributeType {
  code: string;
  label: string;
}

export interface ParsedWorkbook {
  categories: ParsedCategory[];
  supportItems: ParsedSupportItem[];
  prices: ParsedPrice[];
  pricingRegions: ParsedPricingRegion[];
  attributeTypes: ParsedAttributeType[];
  types: { code: string; label: string }[];
  warnings: string[];
  sheetsProcessed: string[];
  sheetsSkipped: string[];
  rowsProcessed: number;
}

export interface RateSetImportSummary {
  sheetsProcessed: string[];
  sheetsSkipped: string[];
  rowsProcessed: number;
  categories: { inserted: number; updated: number; deactivated: number; unchanged: number };
  supportItems: { inserted: number; updated: number; deactivated: number; unchanged: number };
  prices: { inserted: number; updated: number; deleted: number; unchanged: number };
  warnings: string[];
}
