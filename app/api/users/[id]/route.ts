import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getUser,
  updateUserById,
  deleteUserById,
  UserValidationError,
  UserConflictError,
  UserNotFoundError,
  UserDeletionNotAllowedError,
} from "@/services/user.service";

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
    return apiError(400, "VALIDATION_ERROR", "Invalid user id.");
  }

  try {
    await requirePermission(PERMISSIONS.USERS_READ);
    const user = await getUser(id);
    return apiSuccess(user);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    if (err instanceof UserNotFoundError) {
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
    return apiError(400, "VALIDATION_ERROR", "Invalid user id.");
  }

  const body = await request.json();

  try {
    const current = await requirePermission(PERMISSIONS.USERS_UPDATE);
    const user = await updateUserById(id, body, {
      userId: current.user.id,
      roleId: current.role.id,
      permissionCode: PERMISSIONS.USERS_UPDATE,
    });
    return apiSuccess(user);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    if (err instanceof UserValidationError) {
      return apiError(400, "VALIDATION_ERROR", "One or more fields are invalid.", err.details);
    }
    if (err instanceof UserConflictError) {
      return apiError(409, "CONFLICT", err.message);
    }
    if (err instanceof UserNotFoundError) {
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
    return apiError(400, "VALIDATION_ERROR", "Invalid user id.");
  }

  try {
    const current = await requirePermission(PERMISSIONS.USERS_DELETE);
    await deleteUserById(id, {
      userId: current.user.id,
      roleId: current.role.id,
      permissionCode: PERMISSIONS.USERS_DELETE,
    });
    return apiSuccess({ success: true });
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    if (err instanceof UserDeletionNotAllowedError) {
      return apiError(400, "DELETION_NOT_ALLOWED", err.message);
    }
    if (err instanceof UserNotFoundError) {
      return apiError(404, "NOT_FOUND", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
