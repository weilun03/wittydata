import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import { listSupportItemsForCategory } from "@/repositories/invoice-lookup.repository";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.INVOICES_READ);

    const searchParams = request.nextUrl.searchParams;
    const categoryId = Number(searchParams.get("category_id"));

    if (!Number.isInteger(categoryId)) {
      return apiError(400, "VALIDATION_ERROR", "category_id is required.");
    }

    const supportItems = await listSupportItemsForCategory(categoryId);
    return apiSuccess(supportItems);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
