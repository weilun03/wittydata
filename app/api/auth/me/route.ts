import { apiSuccess, apiError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/session";
import { getPermissionCodesForRole } from "@/lib/rbac";

export async function GET() {
  try {
    const current = await getCurrentUser();
    if (!current) {
      return apiSuccess(null);
    }

    const permissions = await getPermissionCodesForRole(current.role.id);

    return apiSuccess({
      user: {
        id: current.user.id,
        email: current.user.email,
        full_name: current.user.full_name,
      },
      role: {
        id: current.role.id,
        code: current.role.code,
        label: current.role.label,
      },
      permissions: [...permissions],
    });
  } catch (err) {
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
