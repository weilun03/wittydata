import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/util-helpers/api-response";
import {
  createProvider,
  listProvidersPaged,
  ProviderValidationError,
} from "@/lib/data-access/services/provider.service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20) || 20));

  const { rows, total } = await listProvidersPaged(page, pageSize);
  return apiSuccess(rows, { total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const provider = await createProvider(body);
    return apiSuccess(provider, undefined, 201);
  } catch (err) {
    if (err instanceof ProviderValidationError) {
      return apiError(400, "VALIDATION_ERROR", "One or more fields are invalid.", err.details);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
