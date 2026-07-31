import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import { revokeSession, SessionNotFoundError } from "@/services/session.service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const current = await requirePermission(PERMISSIONS.AUTH_SESSIONS_REVOKE);
    const revoked = await revokeSession(id, {
      userId: current.user.id,
      roleId: current.role.id,
      permissionCode: PERMISSIONS.AUTH_SESSIONS_REVOKE,
    });
    return apiSuccess(revoked);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    if (err instanceof SessionNotFoundError) {
      return apiError(404, "NOT_FOUND", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
