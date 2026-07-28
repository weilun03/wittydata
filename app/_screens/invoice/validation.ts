export interface InvoiceItemInput {
  id?: unknown;
  category_id?: unknown;
  support_item_id?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  unit?: unknown;
  input_rate?: unknown;
}

export interface InvoiceInput {
  client_id?: unknown;
  provider_id?: unknown;
  invoice_number?: unknown;
  invoice_date?: unknown;
  expected_amount?: unknown;
  status?: unknown;
  items?: unknown;
}

export type ValidationErrors = Record<string, string[]>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidDateInput(value: unknown): value is string {
  return typeof value === "string" && DATE_RE.test(value);
}

export function isValidDecimalInput(value: unknown): value is number | string {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string" && value.trim() !== "") return Number.isFinite(Number(value));
  return false;
}

export function isPositiveIntegerInput(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

// Fields that must be present even when saving as a draft (spec 9.3 "Draft mode").
export function validateInvoiceDraftBase(input: InvoiceInput): ValidationErrors {
  const errors: ValidationErrors = {};
  const addError = (field: string, message: string) => {
    (errors[field] ??= []).push(message);
  };

  if (!isNonEmptyTrimmedString(input.invoice_number)) {
    addError("invoice_number", "Invoice number is required.");
  }
  if (!isValidDateInput(input.invoice_date)) {
    addError("invoice_date", "Invoice date is required.");
  }
  if (!isValidDecimalInput(input.expected_amount)) {
    addError("expected_amount", "Expected amount is required and must be a decimal.");
  }

  return errors;
}

// Additional invoice-level fields only enforced when status = completed.
export function validateInvoiceCompletionFields(input: InvoiceInput): ValidationErrors {
  const errors: ValidationErrors = {};
  const addError = (field: string, message: string) => {
    (errors[field] ??= []).push(message);
  };

  if (!isPositiveIntegerInput(input.client_id)) {
    addError("client_id", "Participant is required.");
  }
  if (!isPositiveIntegerInput(input.provider_id)) {
    addError("provider_id", "Provider is required.");
  }

  return errors;
}
