export interface RoleInput {
  code?: unknown;
  label?: unknown;
  permission_ids?: unknown;
}

export type ValidationErrors = Record<string, string[]>;

const CODE_RE = /^[A-Z][A-Z0-9_]*$/;

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// `code` is immutable once a role is created (RoleForm hides the field on edit and the
// update request never includes it), so callers updating a role must opt out of
// requiring it here — otherwise every update would fail validation for a field it
// never sent.
export function validateRole(input: RoleInput, options: { requireCode?: boolean } = {}): ValidationErrors {
  const { requireCode = true } = options;
  const errors: ValidationErrors = {};
  const addError = (field: string, message: string) => {
    (errors[field] ??= []).push(message);
  };

  if (requireCode) {
    if (!isNonEmptyTrimmedString(input.code)) {
      addError("code", "Code is required.");
    } else if (!CODE_RE.test(input.code.trim().toUpperCase())) {
      addError("code", "Code must start with a letter and contain only letters, numbers, and underscores.");
    }
  }

  if (!isNonEmptyTrimmedString(input.label)) {
    addError("label", "Label is required.");
  }

  if (input.permission_ids !== undefined) {
    if (!Array.isArray(input.permission_ids) || !input.permission_ids.every((id) => typeof id === "number")) {
      addError("permission_ids", "Permissions must be a list of permission ids.");
    }
  }

  return errors;
}
