import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getRole,
  getRolePermissions,
  updateRoleById,
  deactivateRoleById,
  RoleValidationError,
  RoleConflictError,
  RoleNotFoundError,
  RoleDeletionNotAllowedError,
} from "@/services/rbac.service";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id == null) {
    return apiError(400, "VALIDATION_ERROR", "Invalid role id.");
  }

  try {
    await requirePermission(PERMISSIONS.USER_ROLES_READ);
    const [role, permissions] = await Promise.all([getRole(id), getRolePermissions(id)]);
    return apiSuccess({ ...role, permission_ids: permissions.map((p) => p.id) });
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    if (err instanceof RoleNotFoundError) {
      return apiError(404, "NOT_FOUND", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id == null) {
    return apiError(400, "VALIDATION_ERROR", "Invalid role id.");
  }

  const body = await request.json();

  try {
    const current = await requirePermission(PERMISSIONS.USER_ROLES_UPDATE);
    const role = await updateRoleById(id, body, {
      userId: current.user.id,
      roleId: current.role.id,
      permissionCode: PERMISSIONS.USER_ROLES_UPDATE,
    });
    return apiSuccess(role);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    if (err instanceof RoleValidationError) {
      return apiError(400, "VALIDATION_ERROR", "One or more fields are invalid.", err.details);
    }
    if (err instanceof RoleConflictError) {
      return apiError(409, "CONFLICT", err.message);
    }
    if (err instanceof RoleNotFoundError) {
      return apiError(404, "NOT_FOUND", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id == null) {
    return apiError(400, "VALIDATION_ERROR", "Invalid role id.");
  }

  try {
    const current = await requirePermission(PERMISSIONS.USER_ROLES_DELETE);
    await deactivateRoleById(id, {
      userId: current.user.id,
      roleId: current.role.id,
      permissionCode: PERMISSIONS.USER_ROLES_DELETE,
    });
    return apiSuccess({ success: true });
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    if (err instanceof RoleDeletionNotAllowedError) {
      return apiError(400, "DELETION_NOT_ALLOWED", err.message);
    }
    if (err instanceof RoleNotFoundError) {
      return apiError(404, "NOT_FOUND", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
