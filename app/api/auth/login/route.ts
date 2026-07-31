import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { login, InvalidCredentialsError } from "@/services/auth.service";

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const user = await login(body?.email, body?.password);
    return apiSuccess(user);
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return apiError(401, "INVALID_CREDENTIALS", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
