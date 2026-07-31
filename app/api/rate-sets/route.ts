import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createRateSet,
  listRateSetsPaged,
  RateSetValidationError,
  RateSetConflictError,
} from "@/services/rate-set.service";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.RATE_SETS_READ);

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20) || 20));

    const { rows, total } = await listRateSetsPaged(page, pageSize);
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
    const current = await requirePermission(PERMISSIONS.RATE_SETS_CREATE);
    const rateSet = await createRateSet(body, {
      userId: current.user.id,
      roleId: current.role.id,
      permissionCode: PERMISSIONS.RATE_SETS_CREATE,
    });
    return apiSuccess(rateSet, undefined, 201);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    if (err instanceof RateSetValidationError) {
      return apiError(400, "VALIDATION_ERROR", "One or more fields are invalid.", err.details);
    }
    if (err instanceof RateSetConflictError) {
      return apiError(409, "CONFLICT", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
