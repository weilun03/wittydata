export interface ClientInput {
  first_name?: unknown;
  last_name?: unknown;
  gender_id?: unknown;
  dob?: unknown;
  ndis_number?: unknown;
  email?: unknown;
  phone_number?: unknown;
  address?: unknown;
  unit_building?: unknown;
  pricing_region?: unknown;
}

export type ValidationErrors = Record<string, string[]>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIGITS_ONLY_RE = /^\d+$/;

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateClient(input: ClientInput): ValidationErrors {
  const errors: ValidationErrors = {};
  const addError = (field: string, message: string) => {
    (errors[field] ??= []).push(message);
  };

  if (!isNonEmptyTrimmedString(input.first_name)) {
    addError("first_name", "First name is required.");
  }

  if (!isNonEmptyTrimmedString(input.last_name)) {
    addError("last_name", "Last name is required.");
  }

  if (typeof input.gender_id !== "number" || !Number.isInteger(input.gender_id)) {
    addError("gender_id", "Gender is required.");
  }

  if (!isNonEmptyTrimmedString(input.dob)) {
    addError("dob", "Date of birth is required.");
  }

  if (
    typeof input.ndis_number !== "string" ||
    !DIGITS_ONLY_RE.test(input.ndis_number) ||
    input.ndis_number.length > 16
  ) {
    addError("ndis_number", "NDIS number is required, digits only, max 16 digits.");
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

  if (!isNonEmptyTrimmedString(input.pricing_region)) {
    addError("pricing_region", "Pricing region is required.");
  }

  return errors;
}
