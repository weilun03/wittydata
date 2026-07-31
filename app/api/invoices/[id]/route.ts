import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getInvoice,
  updateInvoiceById,
  deleteInvoiceById,
  InvoiceValidationError,
  InvoiceConflictError,
  InvoiceNotFoundError,
} from "@/services/invoice.service";

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
    await requirePermission(PERMISSIONS.INVOICES_READ);
    const invoice = await getInvoice(id);
    return apiSuccess(invoice);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
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
    const current = await requirePermission(PERMISSIONS.INVOICES_UPDATE);
    const invoice = await updateInvoiceById(id, body, {
      userId: current.user.id,
      roleId: current.role.id,
      permissionCode: PERMISSIONS.INVOICES_UPDATE,
    });
    return apiSuccess(invoice);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id == null) {
    return apiError(400, "VALIDATION_ERROR", "Invalid invoice id.");
  }

  try {
    const current = await requirePermission(PERMISSIONS.INVOICES_DELETE);
    await deleteInvoiceById(id, {
      userId: current.user.id,
      roleId: current.role.id,
      permissionCode: PERMISSIONS.INVOICES_DELETE,
    });
    return apiSuccess({ success: true });
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    if (err instanceof InvoiceNotFoundError) {
      return apiError(404, "NOT_FOUND", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
