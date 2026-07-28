export interface RateSetInput {
  name?: unknown;
  description?: unknown;
  start_date?: unknown;
  end_date?: unknown;
}

export type ValidationErrors = Record<string, string[]>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateRateSet(input: RateSetInput): ValidationErrors {
  const errors: ValidationErrors = {};
  const addError = (field: string, message: string) => {
    (errors[field] ??= []).push(message);
  };

  if (!isNonEmptyTrimmedString(input.name)) {
    addError("name", "Name is required.");
  }

  if (input.description != null && input.description !== "") {
    if (!isNonEmptyTrimmedString(input.description)) {
      addError("description", "Description must not be empty if provided.");
    }
  }

  if (typeof input.start_date !== "string" || !DATE_RE.test(input.start_date)) {
    addError("start_date", "Start date is required.");
  }

  if (input.end_date != null && input.end_date !== "") {
    if (typeof input.end_date !== "string" || !DATE_RE.test(input.end_date)) {
      addError("end_date", "End date must be a valid date.");
    } else if (
      typeof input.start_date === "string" &&
      DATE_RE.test(input.start_date) &&
      input.end_date < input.start_date
    ) {
      addError("end_date", "End date must be on or after the start date.");
    }
  }

  return errors;
}
