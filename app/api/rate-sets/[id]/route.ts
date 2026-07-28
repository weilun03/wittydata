import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/util-helpers/api-response";
import {
  getRateSet,
  updateRateSetById,
  RateSetValidationError,
  RateSetConflictError,
  RateSetNotFoundError,
} from "@/lib/data-access/services/rate-set.service";

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
    return apiError(400, "VALIDATION_ERROR", "Invalid rate set id.");
  }

  try {
    const rateSet = await getRateSet(id);
    return apiSuccess(rateSet);
  } catch (err) {
    if (err instanceof RateSetNotFoundError) {
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
    return apiError(400, "VALIDATION_ERROR", "Invalid rate set id.");
  }

  const body = await request.json();

  try {
    const rateSet = await updateRateSetById(id, body);
    return apiSuccess(rateSet);
  } catch (err) {
    if (err instanceof RateSetValidationError) {
      return apiError(400, "VALIDATION_ERROR", "One or more fields are invalid.", err.details);
    }
    if (err instanceof RateSetConflictError) {
      return apiError(409, "CONFLICT", err.message);
    }
    if (err instanceof RateSetNotFoundError) {
      return apiError(404, "NOT_FOUND", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
