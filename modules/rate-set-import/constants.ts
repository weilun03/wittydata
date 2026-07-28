// Column layout of the NDIS Support Catalogue "Current/Legacy Support Items"
// worksheets, per reference/ndis_excel_import_logic.sql. Indices are 0-based
// (A=0, B=1, ... AB=27).
export const COL = {
  ITEM_NUMBER: 0, // A
  ITEM_NAME: 1, // B
  CATEGORY_NUMBER: 5, // F (Support Category Number (PACE))
  CATEGORY_NAME: 7, // H (Support Category Name (PACE))
  UNIT: 8, // I
  QUOTE: 9, // J
  START_DATE: 10, // K
  END_DATE: 11, // L
  TYPE: 27, // AB
} as const;

// Column M (12) through V (21): one pricing region per column.
export const PRICING_REGION_COLUMNS_START = 12; // M
export const PRICING_REGION_COLUMNS_END = 21; // V

// Fixed English names for the 10 NDIS pricing regions. The Excel header only
// gives the abbreviation (e.g. "ACT"); the full name isn't in the file.
export const PRICING_REGION_FULL_LABELS: Record<string, string> = {
  ACT: "Australian Capital Territory",
  NSW: "New South Wales",
  NT: "Northern Territory",
  QLD: "Queensland",
  SA: "South Australia",
  TAS: "Tasmania",
  VIC: "Victoria",
  WA: "Western Australia",
  REMOTE: "Remote",
  VERY_REMOTE: "Very Remote",
};

// Columns W (22) through AA (26): one boolean attribute flag per column,
// mapped to a fixed attribute_code.
export const ATTRIBUTE_COLUMNS: { column: number; code: string }[] = [
  { column: COL.QUOTE, code: "IS_QUOTE_REQUIRED" }, // J
  { column: 22, code: "IS_NF2F_SUPPORT_PROVISION" }, // W
  { column: 23, code: "IS_PROVIDER_TRAVEL" }, // X
  { column: 24, code: "IS_SHORT_NOTICE_CANCEL" }, // Y
  { column: 25, code: "IS_NDIA_REQUESTED_REPORTS" }, // Z
  { column: 26, code: "IS_IRREGULAR_SIL_SUPPORTS" }, // AA
];

// The header text a worksheet must start with to be recognized as a
// "Current/Legacy Support Items"-shaped sheet. Files sometimes carry extra
// decorative/legacy worksheets (e.g. "Sheet3", "Support Catalogue") that
// don't match this layout — those are skipped rather than processed.
export const EXPECTED_HEADER_A1 = "Support Item Number";
