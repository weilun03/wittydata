import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/util-helpers/api-response";
import { listSupportItemsForCategory } from "@/lib/data-access/repositories/invoice-lookup.repository";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoryId = Number(searchParams.get("category_id"));

  if (!Number.isInteger(categoryId)) {
    return apiError(400, "VALIDATION_ERROR", "category_id is required.");
  }

  const supportItems = await listSupportItemsForCategory(categoryId);
  return apiSuccess(supportItems);
}
