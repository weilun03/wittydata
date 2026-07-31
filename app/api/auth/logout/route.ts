import { apiSuccess, apiError } from "@/lib/api-response";
import { logout } from "@/services/auth.service";

export async function POST() {
  try {
    await logout();
    return apiSuccess({ success: true });
  } catch (err) {
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
