export interface AuditLogRecord {
  id: string;
  actor_user_id: number | null;
  actor_full_name: string | null;
  actor_role_id: number | null;
  actor_role_label: string | null;
  action: "create" | "update" | "delete";
  permission_code: string | null;
  entity: string;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  changes_diff: Record<string, { before: unknown; after: unknown }> | null;
  created_at: string;
}
