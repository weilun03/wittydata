import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requirePermission, rbacApiError } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/permissions";
import { listAuditLogsPaged } from "@/services/audit.service";
import type { AuditLogFilters } from "@/repositories/audit-log.repository";

const VALID_ACTIONS = new Set(["create", "update", "delete"]);

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.AUDIT_LOGS_READ);

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20) || 20));

    const rawUserId = searchParams.get("userId");
    const rawAction = searchParams.get("action");
    const rawEntity = searchParams.get("entity");
    const rawFrom = searchParams.get("from");
    const rawTo = searchParams.get("to");

    const filters: AuditLogFilters = {
      userId: rawUserId != null ? Number(rawUserId) : undefined,
      entity: rawEntity ?? undefined,
      action:
        rawAction && VALID_ACTIONS.has(rawAction)
          ? (rawAction as AuditLogFilters["action"])
          : undefined,
      from: rawFrom ? new Date(rawFrom) : undefined,
      to: rawTo ? new Date(rawTo) : undefined,
    };

    const { rows, total } = await listAuditLogsPaged(filters, page, pageSize);
    return apiSuccess(rows, { total, page, pageSize });
  } catch (err) {
    const authErr = rbacApiError(err);
    if (authErr) return authErr;
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
}
