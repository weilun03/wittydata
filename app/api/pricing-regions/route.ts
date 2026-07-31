import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuthenticated, rbacApiError } from "@/lib/rbac";
import { listPricingRegions } from "@/repositories/lookup.repository";

// Pricing regions aren't their own RBAC scope (used by both the participant form
// and the invoice form under different permissions) — just require a valid session.
export async function GET() {
  try {
    await requireAuthenticated();
    const regions = await listPricingRegions();
    return apiSuccess(regions);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
