import { apiSuccess } from "@/lib/util-helpers/api-response";
import { listGenders } from "@/lib/data-access/repositories/lookup.repository";

export async function GET() {
  const genders = await listGenders();
  return apiSuccess(genders);
}
