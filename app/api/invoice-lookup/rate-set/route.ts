import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import { toUtcEndOfDay, toUtcStartOfDay } from "@/modules/invoice/dates";
import { isValidDateInput } from "@/modules/invoice/validation";
import { findRateSetsOverlapping, listCategoriesForRateSet } from "@/repositories/invoice-lookup.repository";

// Read-only preview for the invoice item form: given a date range, resolve
// which rate set applies (per spec 9.3) and list its categories, so the UI
// can populate the category dropdown before the item is actually saved.
// The server re-derives this authoritatively on save regardless.
export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.INVOICES_READ);

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
      return apiError(400, "VALIDATION_ERROR", "start_date and end_date (YYYY-MM-DD) are required.");
    }

    const matches = await findRateSetsOverlapping(toUtcStartOfDay(startDate), toUtcEndOfDay(endDate));

    if (matches.length === 0) {
      return apiSuccess({ rateSet: null, ambiguous: false, categories: [] });
    }
    if (matches.length > 1) {
      return apiSuccess({ rateSet: null, ambiguous: true, categories: [] });
    }

    const categories = await listCategoriesForRateSet(matches[0].id);
    return apiSuccess({ rateSet: matches[0], ambiguous: false, categories });
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
