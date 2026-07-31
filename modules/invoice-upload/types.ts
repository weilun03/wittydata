// Shape the model is instructed to return (spec 11.3). Every field is nullable —
// the model is told to use null for anything it cannot find, and this sanitizer
// re-validates that on our side rather than trusting the model's output blindly.
export interface ExtractedLineItem {
  unit: string | null;
  invoiced_rate: string | null;
  stated_amount: string | null;
  service_start_date: string | null;
  service_end_date: string | null;
  support_item_number: string | null;
}

export interface ExtractedInvoiceData {
  participant_name: string | null;
  participant_ndis_number: string | null;
  provider_name: string | null;
  provider_abn: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  stated_invoice_total: string | null;
  line_items: ExtractedLineItem[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function asNullableString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNullableDate(value: unknown): string | null {
  const str = asNullableString(value);
  return str && DATE_RE.test(str) ? str : null;
}

function asNullableDigits(value: unknown): string | null {
  const str = asNullableString(value);
  if (!str) return null;
  const digits = str.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

function asNullableDecimalString(value: unknown): string | null {
  const str = asNullableString(value);
  if (!str) return null;
  const cleaned = str.replace(/[^0-9.\-]/g, "");
  return cleaned.length > 0 && Number.isFinite(Number(cleaned)) ? cleaned : null;
}

function sanitizeLineItem(raw: unknown): ExtractedLineItem {
  const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    unit: asNullableDecimalString(item.unit),
    invoiced_rate: asNullableDecimalString(item.invoiced_rate),
    stated_amount: asNullableDecimalString(item.stated_amount),
    service_start_date: asNullableDate(item.service_start_date),
    service_end_date: asNullableDate(item.service_end_date),
    support_item_number: asNullableString(item.support_item_number),
  };
}

// Defensively re-validates the model's raw JSON — the model may omit fields,
// hallucinate types, or wrap values in the wrong shape (spec 11.4: "AI extraction
// must handle partial or missing fields ... not assume perfect input format").
export function sanitizeExtractedInvoice(raw: unknown): ExtractedInvoiceData {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lineItemsRaw = Array.isArray(obj.line_items) ? obj.line_items : [];

  return {
    participant_name: asNullableString(obj.participant_name),
    participant_ndis_number: asNullableDigits(obj.participant_ndis_number),
    provider_name: asNullableString(obj.provider_name),
    provider_abn: asNullableDigits(obj.provider_abn),
    invoice_number: asNullableString(obj.invoice_number),
    invoice_date: asNullableDate(obj.invoice_date),
    stated_invoice_total: asNullableDecimalString(obj.stated_invoice_total),
    line_items: lineItemsRaw.map(sanitizeLineItem),
  };
}
