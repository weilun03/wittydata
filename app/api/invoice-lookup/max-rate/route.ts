import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/util-helpers/api-response";
import { toUtcEndOfDay, toUtcStartOfDay } from "@/app/_screens/invoice/dates";
import { isValidDateInput } from "@/app/_screens/invoice/validation";
import { findBestPrice, getClientPricingRegion } from "@/lib/data-access/repositories/invoice-lookup.repository";

export async function GET(request: NextRequest) {
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
}
