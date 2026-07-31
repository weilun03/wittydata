import { db } from "@/lib/db";

const SENSITIVE_KEYS = new Set(["password", "password_hash", "token", "token_hash"]);

function redact(record: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    out[key] = SENSITIVE_KEYS.has(key) ? "[redacted]" : value;
  }
  return out;
}

function diffFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const beforeValue = before[key];
    const afterValue = after[key];
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      diff[key] = { before: beforeValue, after: afterValue };
    }
  }
  return diff;
}

// Common shape services pass down from `requirePermission()` so they can attribute
// the mutation to a user/role and record which permission authorized it.
export interface ActorContext {
  userId: number;
  roleId: number;
  permissionCode: string;
}

export interface AuditLogInput {
  actor: { userId: number; roleId: number } | null;
  action: "create" | "update" | "delete";
  // Null for actions that aren't gated by a specific RBAC permission (e.g. a user
  // changing their own password, or the login/logout that creates/revokes a session).
  permissionCode: string | null;
  entity: string;
  entityId: string | number;
  // The record's state before the change (omit for creates).
  before?: Record<string, unknown> | null;
  // The record's state after the change (omit for deletes).
  after?: Record<string, unknown> | null;
}

// Never throws: a failed audit write must not break the underlying operation.
export async function recordAuditLog(input: AuditLogInput) {
  try {
    const payload = input.before ? redact(input.before) : input.after ? redact(input.after) : null;
    const changesDiff =
      input.action === "update" && input.before && input.after
        ? diffFields(redact(input.before), redact(input.after))
        : null;

    await db
      .insertInto("audit_log")
      .values({
        actor_user_id: input.actor?.userId ?? null,
        actor_role_id: input.actor?.roleId ?? null,
        action: input.action,
        permission_code: input.permissionCode,
        entity: input.entity,
        entity_id: String(input.entityId),
        payload: payload ? JSON.stringify(payload) : null,
        changes_diff: changesDiff ? JSON.stringify(changesDiff) : null,
      })
      .execute();
  } catch (err) {
    console.error("Failed to write audit log", { entity: input.entity, action: input.action, err });
  }
}
