import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/util-helpers/api-response";
import {
  getInvoice,
  updateInvoiceById,
  InvoiceValidationError,
  InvoiceConflictError,
  InvoiceNotFoundError,
} from "@/lib/data-access/services/invoice.service";

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
    return apiError(400, "VALIDATION_ERROR", "Invalid invoice id.");
  }

  try {
    const invoice = await getInvoice(id);
    return apiSuccess(invoice);
  } catch (err) {
    if (err instanceof InvoiceNotFoundError) {
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
    return apiError(400, "VALIDATION_ERROR", "Invalid invoice id.");
  }

  const body = await request.json();

  try {
    const invoice = await updateInvoiceById(id, body);
    return apiSuccess(invoice);
  } catch (err) {
    if (err instanceof InvoiceValidationError) {
      return apiError(400, "VALIDATION_ERROR", "One or more fields are invalid.", err.details);
    }
    if (err instanceof InvoiceConflictError) {
      return apiError(409, "CONFLICT", err.message);
    }
    if (err instanceof InvoiceNotFoundError) {
      return apiError(404, "NOT_FOUND", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
