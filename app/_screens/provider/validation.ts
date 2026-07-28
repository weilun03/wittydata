export interface ProviderInput {
  abn?: unknown;
  name?: unknown;
  email?: unknown;
  phone_number?: unknown;
  address?: unknown;
  unit_building?: unknown;
}

export type ValidationErrors = Record<string, string[]>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIGITS_ONLY_RE = /^\d+$/;

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateProvider(input: ProviderInput): ValidationErrors {
  const errors: ValidationErrors = {};
  const addError = (field: string, message: string) => {
    (errors[field] ??= []).push(message);
  };

  if (
    typeof input.abn !== "string" ||
    !DIGITS_ONLY_RE.test(input.abn) ||
    input.abn.length > 11
  ) {
    addError("abn", "ABN is required, digits only, max 11 digits.");
  }

  if (!isNonEmptyTrimmedString(input.name)) {
    addError("name", "Name is required.");
  }

  if (typeof input.email !== "string" || !EMAIL_RE.test(input.email)) {
    addError("email", "A valid email address is required.");
  }

  if (input.phone_number != null && input.phone_number !== "") {
    if (
      typeof input.phone_number !== "string" ||
      !DIGITS_ONLY_RE.test(input.phone_number) ||
      input.phone_number.length < 3 ||
      input.phone_number.length > 16
    ) {
      addError("phone_number", "Phone number must be digits only, 3-16 digits.");
    }
  }

  if (!isNonEmptyTrimmedString(input.address)) {
    addError("address", "Address is required.");
  }

  if (input.unit_building != null && input.unit_building !== "") {
    if (!isNonEmptyTrimmedString(input.unit_building)) {
      addError("unit_building", "Unit/Building must not be empty if provided.");
    }
  }

  return errors;
}
