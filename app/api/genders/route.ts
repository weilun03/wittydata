import { apiSuccess } from "@/lib/api-response";
import { listGenders } from "@/repositories/lookup.repository";

export async function GET() {
  const genders = await listGenders();
  return apiSuccess(genders);
}
