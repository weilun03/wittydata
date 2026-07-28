import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/util-helpers/api-response";
import {
  createInvoice,
  listInvoicesPaged,
  InvoiceValidationError,
  InvoiceConflictError,
} from "@/lib/data-access/services/invoice.service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20) || 20));

  const { rows, total } = await listInvoicesPaged(page, pageSize);
  return apiSuccess(rows, { total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const invoice = await createInvoice(body);
    return apiSuccess(invoice, undefined, 201);
  } catch (err) {
    if (err instanceof InvoiceValidationError) {
      return apiError(400, "VALIDATION_ERROR", "One or more fields are invalid.", err.details);
    }
    if (err instanceof InvoiceConflictError) {
      return apiError(409, "CONFLICT", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
