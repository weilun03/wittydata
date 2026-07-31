import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UnauthenticatedError } from "@/lib/rbac";
import {
  changeOwnPassword,
  IncorrectPasswordError,
  PasswordValidationError,
} from "@/services/auth.service";

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    await changeOwnPassword(body?.current_password, body?.new_password);
    return apiSuccess({ success: true });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return apiError(401, "UNAUTHENTICATED", err.message);
    }
    if (err instanceof IncorrectPasswordError) {
      return apiError(400, "INCORRECT_PASSWORD", err.message);
    }
    if (err instanceof PasswordValidationError) {
      return apiError(400, "VALIDATION_ERROR", "One or more fields are invalid.", err.details);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
