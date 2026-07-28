import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/util-helpers/api-response";
import {
  getProvider,
  updateProviderById,
  ProviderValidationError,
  ProviderNotFoundError,
} from "@/lib/data-access/services/provider.service";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id == null) {
    return apiError(400, "VALIDATION_ERROR", "Invalid provider id.");
  }

  try {
    const provider = await getProvider(id);
    return apiSuccess(provider);
  } catch (err) {
    if (err instanceof ProviderNotFoundError) {
      return apiError(404, "NOT_FOUND", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id == null) {
    return apiError(400, "VALIDATION_ERROR", "Invalid provider id.");
  }

  const body = await request.json();

  try {
    const provider = await updateProviderById(id, body);
    return apiSuccess(provider);
  } catch (err) {
    if (err instanceof ProviderValidationError) {
      return apiError(400, "VALIDATION_ERROR", "One or more fields are invalid.", err.details);
    }
    if (err instanceof ProviderNotFoundError) {
      return apiError(404, "NOT_FOUND", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
