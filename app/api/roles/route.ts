import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import { listRoles, listRolesPaged, createRole, RoleValidationError, RoleConflictError } from "@/services/rbac.service";

// Same two-shapes-behind-one-route pattern as /api/genders: no query params keeps the
// plain active-only list the user form's role_id dropdown has always used; `?page=`
// switches to the paginated admin view (including deactivated roles + permission counts).
export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.USER_ROLES_READ);

    const searchParams = request.nextUrl.searchParams;
    if (!searchParams.has("page")) {
      const roles = await listRoles();
      return apiSuccess(roles);
    }

    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20) || 20));
    const { rows, total } = await listRolesPaged(page, pageSize);
    return apiSuccess(rows, { total, page, pageSize });
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const current = await requirePermission(PERMISSIONS.USER_ROLES_CREATE);
    const role = await createRole(body, {
      userId: current.user.id,
      roleId: current.role.id,
      permissionCode: PERMISSIONS.USER_ROLES_CREATE,
    });
    return apiSuccess(role, undefined, 201);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    if (err instanceof RoleValidationError) {
      return apiError(400, "VALIDATION_ERROR", "One or more fields are invalid.", err.details);
    }
    if (err instanceof RoleConflictError) {
      return apiError(409, "CONFLICT", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
