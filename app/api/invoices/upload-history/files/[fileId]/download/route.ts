import { apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import { getUploadFileDownloadUrl, UploadFileNotFoundError } from "@/services/invoice-upload.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;

  try {
    await requirePermission(PERMISSIONS.INVOICES_UPLOADS_MANAGE);
    const url = await getUploadFileDownloadUrl(fileId);
    return Response.redirect(url, 302);
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    if (err instanceof UploadFileNotFoundError) {
      return apiError(404, "NOT_FOUND", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
