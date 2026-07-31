import * as auditLogRepo from "@/repositories/audit-log.repository";
import type { AuditLogFilters } from "@/repositories/audit-log.repository";

export async function listAuditLogsPaged(filters: AuditLogFilters, page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return auditLogRepo.listAuditLogs(filters, { limit: pageSize, offset });
}
