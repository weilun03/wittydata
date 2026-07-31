import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import { listAllPermissions } from "@/services/rbac.service";

// The fixed catalog of assignable permissions, for the role-edit checkbox list.
// Permissions themselves aren't user-manageable — only which ones a role has.
export async function GET() {
  try {
    await requirePermission(PERMISSIONS.USER_ROLES_READ);
    const permissions = await listAllPermissions();
    return apiSuccess(permissions);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
