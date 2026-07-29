import { apiSuccess } from "@/lib/api-response";
import { listPricingRegions } from "@/repositories/lookup.repository";

export async function GET() {
  const regions = await listPricingRegions();
  return apiSuccess(regions);
}
