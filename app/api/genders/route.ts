import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import { listGenders } from "@/repositories/lookup.repository";
import { listGendersPaged, createGender, GenderValidationError, GenderConflictError } from "@/services/gender.service";

// Two shapes behind one route: with no query params this stays the plain active-only
// lookup ClientForm's dropdown has always used; `?page=` switches to the paginated
// admin view (including deactivated rows) for the Genders management page.
export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.GENDERS_READ);

    const searchParams = request.nextUrl.searchParams;
    if (!searchParams.has("page")) {
      const genders = await listGenders();
      return apiSuccess(genders);
    }

    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20) || 20));
    const { rows, total } = await listGendersPaged(page, pageSize);
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
    const current = await requirePermission(PERMISSIONS.GENDERS_CREATE);
    const gender = await createGender(body, {
      userId: current.user.id,
      roleId: current.role.id,
      permissionCode: PERMISSIONS.GENDERS_CREATE,
    });
    return apiSuccess(gender, undefined, 201);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    if (err instanceof GenderValidationError) {
      return apiError(400, "VALIDATION_ERROR", "One or more fields are invalid.", err.details);
    }
    if (err instanceof GenderConflictError) {
      return apiError(409, "CONFLICT", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
