import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import {
  uploadAndProcessInvoicePdf,
  InvoiceUploadValidationError,
} from "@/services/invoice-upload.service";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return apiError(400, "VALIDATION_ERROR", "A PDF file is required (field name 'file').");
  }

  try {
    const current = await requirePermission(PERMISSIONS.INVOICES_UPLOADS_MANAGE);
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadAndProcessInvoicePdf(
      { name: file.name, type: file.type, buffer },
      {
        userId: current.user.id,
        roleId: current.role.id,
        permissionCode: PERMISSIONS.INVOICES_UPLOADS_MANAGE,
      },
    );
    return apiSuccess(result, undefined, 201);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    if (err instanceof InvoiceUploadValidationError) {
      return apiError(400, "VALIDATION_ERROR", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong while processing the invoice.");
  }
}
