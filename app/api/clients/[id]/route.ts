import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/util-helpers/api-response";
import {
  getClient,
  updateClientById,
  ClientValidationError,
  ClientConflictError,
  ClientNotFoundError,
} from "@/lib/data-access/services/client.service";

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
    return apiError(400, "VALIDATION_ERROR", "Invalid participant id.");
  }

  try {
    const client = await getClient(id);
    return apiSuccess(client);
  } catch (err) {
    if (err instanceof ClientNotFoundError) {
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
    return apiError(400, "VALIDATION_ERROR", "Invalid participant id.");
  }

  const body = await request.json();

  try {
    const client = await updateClientById(id, body);
    return apiSuccess(client);
  } catch (err) {
    if (err instanceof ClientValidationError) {
      return apiError(400, "VALIDATION_ERROR", "One or more fields are invalid.", err.details);
    }
    if (err instanceof ClientConflictError) {
      return apiError(409, "CONFLICT", err.message);
    }
    if (err instanceof ClientNotFoundError) {
      return apiError(404, "NOT_FOUND", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
