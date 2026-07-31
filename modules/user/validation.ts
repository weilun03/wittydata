export interface UserInput {
  email?: unknown;
  full_name?: unknown;
  role_id?: unknown;
}

export type ValidationErrors = Record<string, string[]>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateUser(input: UserInput): ValidationErrors {
  const errors: ValidationErrors = {};
  const addError = (field: string, message: string) => {
    (errors[field] ??= []).push(message);
  };

  if (typeof input.email !== "string" || !EMAIL_RE.test(input.email)) {
    addError("email", "A valid email address is required.");
  }

  if (!isNonEmptyTrimmedString(input.full_name)) {
    addError("full_name", "Full name is required.");
  }

  if (typeof input.role_id !== "number" || !Number.isInteger(input.role_id)) {
    addError("role_id", "Role is required.");
  }

  return errors;
}

export function validatePassword(password: unknown): ValidationErrors {
  const errors: ValidationErrors = {};
  if (typeof password !== "string" || password.length < 8) {
    (errors.password ??= []).push("Password is required and must be at least 8 characters.");
  }
  return errors;
}
