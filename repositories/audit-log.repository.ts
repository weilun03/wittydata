import { sql, type SqlBool } from "kysely";
import { db } from "@/lib/db";

export interface AuditLogFilters {
  userId?: number;
  entity?: string;
  action?: "create" | "update" | "delete";
  from?: Date;
  to?: Date;
}

const filteredAuditLogs = (filters: AuditLogFilters) => {
  let query = db
    .selectFrom("audit_log")
    .leftJoin("app_user", "app_user.id", "audit_log.actor_user_id")
    .leftJoin("rbac_role", "rbac_role.id", "audit_log.actor_role_id");

  if (filters.userId !== undefined) {
    query = query.where("audit_log.actor_user_id", "=", filters.userId);
  }
  if (filters.entity) {
    query = query.where("audit_log.entity", "=", filters.entity);
  }
  if (filters.action) {
    query = query.where("audit_log.action", "=", filters.action);
  }
  if (filters.from) {
    query = query.where(sql<SqlBool>`audit_log.created_at >= ${filters.from}`);
  }
  if (filters.to) {
    query = query.where(sql<SqlBool>`audit_log.created_at <= ${filters.to}`);
  }

  return query;
};

export async function listAuditLogs(
  filters: AuditLogFilters,
  { limit, offset }: { limit: number; offset: number },
) {
  const [rows, totalRow] = await Promise.all([
    filteredAuditLogs(filters)
      .select([
        "audit_log.id",
        "audit_log.actor_user_id",
        "app_user.full_name as actor_full_name",
        "audit_log.actor_role_id",
        "rbac_role.label as actor_role_label",
        "audit_log.action",
        "audit_log.permission_code",
        "audit_log.entity",
        "audit_log.entity_id",
        "audit_log.payload",
        "audit_log.changes_diff",
        "audit_log.created_at",
      ])
      .orderBy("audit_log.created_at", "desc")
      .limit(limit)
      .offset(offset)
      .execute(),
    filteredAuditLogs(filters)
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
  ]);

  return { rows, total: Number(totalRow.count) };
}
