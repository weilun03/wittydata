import { apiSuccess } from "@/lib/util-helpers/api-response";
import { listPricingRegions } from "@/lib/data-access/repositories/lookup.repository";

export async function GET() {
  const regions = await listPricingRegions();
  return apiSuccess(regions);
}
