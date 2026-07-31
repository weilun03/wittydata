import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import { toUtcEndOfDay, toUtcStartOfDay } from "@/modules/invoice/dates";
import { isValidDateInput } from "@/modules/invoice/validation";
import { findBestPrice, getClientPricingRegion } from "@/repositories/invoice-lookup.repository";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.INVOICES_READ);

    const searchParams = request.nextUrl.searchParams;
    const rateSetId = Number(searchParams.get("rate_set_id"));
    const supportItemId = Number(searchParams.get("support_item_id"));
    const clientId = Number(searchParams.get("client_id"));
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (
      !Number.isInteger(rateSetId) ||
      !Number.isInteger(supportItemId) ||
      !Number.isInteger(clientId) ||
      !isValidDateInput(startDate) ||
      !isValidDateInput(endDate)
    ) {
      return apiError(
        400,
        "VALIDATION_ERROR",
        "rate_set_id, support_item_id, client_id, start_date and end_date are all required.",
      );
    }

    const regionCode = await getClientPricingRegion(clientId);
    if (!regionCode) {
      return apiSuccess({ maxRate: null });
    }

    const price = await findBestPrice({
      rateSetId,
      supportItemId,
      regionCode,
      startDate: toUtcStartOfDay(startDate),
      endDate: toUtcEndOfDay(endDate),
    });

    return apiSuccess({ maxRate: price?.unit_price ?? null });
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
