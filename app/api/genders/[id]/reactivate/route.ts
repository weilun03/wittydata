import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import { reactivateGenderById, GenderNotFoundError } from "@/services/gender.service";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id == null) {
    return apiError(400, "VALIDATION_ERROR", "Invalid gender id.");
  }

  try {
    const current = await requirePermission(PERMISSIONS.GENDERS_UPDATE);
    const gender = await reactivateGenderById(id, {
      userId: current.user.id,
      roleId: current.role.id,
      permissionCode: PERMISSIONS.GENDERS_UPDATE,
    });
    return apiSuccess(gender);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    if (err instanceof GenderNotFoundError) {
      return apiError(404, "NOT_FOUND", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
