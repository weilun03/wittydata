import { cache } from "react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/api-response";
import type { PermissionCode } from "@/lib/permissions";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  constructor(public permission: string) {
    super(`Missing permission: ${permission}`);
    this.name = "ForbiddenError";
  }
}

export const getPermissionCodesForRole = cache(async (roleId: number) => {
  const rows = await db
    .selectFrom("rbac_user_role_permission")
    .innerJoin("rbac_permission", "rbac_permission.id", "rbac_user_role_permission.permission_id")
    .select("rbac_permission.code")
    .where("rbac_user_role_permission.role_id", "=", roleId)
    .execute();

  return new Set(rows.map((row) => row.code));
});

// For endpoints that only need "is someone logged in" — cross-cutting reference
// data (e.g. pricing regions) that isn't its own RBAC permission scope and is read
// by multiple modules under different permissions. Prefer requirePermission()
// wherever the spec defines a scope for the data being served.
export async function requireAuthenticated() {
  const current = await getCurrentUser();
  if (!current) {
    throw new UnauthenticatedError();
  }
  return current;
}

// Verifies the caller is authenticated and holds `permissionCode`; throws otherwise.
// Returns the current user/role/session so callers can use it for audit logging.
export async function requirePermission(permissionCode: PermissionCode) {
  const current = await getCurrentUser();
  if (!current) {
    throw new UnauthenticatedError();
  }

  const permissions = await getPermissionCodesForRole(current.role.id);
  if (!permissions.has(permissionCode)) {
    throw new ForbiddenError(permissionCode);
  }

  return current;
}

// Route handlers call this first in every catch block to translate auth/permission
// failures into the right HTTP status; returns null for anything else so the caller
// can fall through to its own error mapping.
export function rbacApiError(err: unknown) {
  if (err instanceof UnauthenticatedError) {
    return apiError(401, "UNAUTHENTICATED", err.message);
  }
  if (err instanceof ForbiddenError) {
    return apiError(403, "FORBIDDEN", err.message);
  }
  return null;
}
