export interface GenderInput {
  code?: unknown;
  label?: unknown;
}

export type ValidationErrors = Record<string, string[]>;

const CODE_RE = /^[A-Z0-9_]+$/;

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateGender(input: GenderInput): ValidationErrors {
  const errors: ValidationErrors = {};
  const addError = (field: string, message: string) => {
    (errors[field] ??= []).push(message);
  };

  if (!isNonEmptyTrimmedString(input.code)) {
    addError("code", "Code is required.");
  } else if (!CODE_RE.test(input.code.trim().toUpperCase())) {
    addError("code", "Code must contain only letters, numbers, and underscores.");
  }

  if (!isNonEmptyTrimmedString(input.label)) {
    addError("label", "Label is required.");
  }

  return errors;
}
