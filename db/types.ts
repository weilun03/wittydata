import type { ColumnType, Generated } from "kysely";

// Postgres `numeric` columns come back from `pg` as strings (not JS numbers) to
// avoid float precision loss — always do arithmetic on them via bignumber.js.
type Numeric = string;
type Timestamptz = ColumnType<Date, Date | string, Date | string>;
// `date` columns are read back as plain "YYYY-MM-DD" strings (see lib/db.ts
// type parser) to avoid the node-postgres UTC-midnight timezone-shift gotcha.
type DateOnly = string;

export interface RateSetTable {
  id: Generated<number>;
  name: string;
  description: string | null;
  start_date: Timestamptz;
  end_date: Timestamptz | null;
  created_at: Generated<Timestamptz>;
  updated_at: Generated<Timestamptz>;
  deactivated_at: Timestamptz | null;
  deleted_at: Timestamptz | null;
}

export interface RateSetCategoryTable {
  id: Generated<number>;
  rate_set_id: number;
  category_number: string;
  category_name: string;
  sorting: Generated<number>;
  created_at: Generated<Timestamptz>;
  updated_at: Generated<Timestamptz>;
  deactivated_at: Timestamptz | null;
  deleted_at: Timestamptz | null;
}

export interface RateSetSupportItemTable {
  id: Generated<number>;
  rate_set_id: number;
  category_id: number;
  item_number: string;
  item_name: string;
  unit: string | null;
  sorting: Generated<number>;
  created_at: Generated<Timestamptz>;
  updated_at: Generated<Timestamptz>;
  deactivated_at: Timestamptz | null;
  deleted_at: Timestamptz | null;
}

export interface RateSetSupportItemAttributeTypeTable {
  code: string;
  label: string;
  created_at: Generated<Timestamptz>;
  deactivated_at: Timestamptz | null;
}

export interface RateSetSupportItemAttributeTable {
  id: Generated<number>;
  support_item_id: number;
  attribute_code: string;
  value: Generated<boolean>;
  created_at: Generated<Timestamptz>;
}

export interface RateSetSupportItemTypeTable {
  id: Generated<number>;
  code: string;
  label: string;
  created_at: Generated<Timestamptz>;
  deactivated_at: Timestamptz | null;
}

export interface RateSetSupportItemPricingRegionTable {
  code: string;
  label: string;
  full_label: string;
  created_at: Generated<Timestamptz>;
  deactivated_at: Timestamptz | null;
}

export interface RateSetSupportItemPriceTable {
  id: Generated<number>;
  rate_set_id: number;
  support_item_id: number;
  type_id: number | null;
  pricing_region_code: string | null;
  unit_price: Numeric | null;
  start_date: Timestamptz;
  end_date: Timestamptz | null;
  created_at: Generated<Timestamptz>;
  updated_at: Generated<Timestamptz>;
}

export interface GenderTable {
  id: Generated<number>;
  code: string;
  label: string;
  created_at: Generated<Timestamptz>;
  updated_at: Generated<Timestamptz>;
  deactivated_at: Timestamptz | null;
}

export interface ClientTable {
  id: Generated<number>;
  first_name: string;
  last_name: string;
  name_parts: Generated<string[]>; // populated by DB trigger, never write directly
  gender_id: number;
  dob: DateOnly;
  ndis_number: string;
  email: string;
  phone_number: string | null;
  address: string;
  unit_building: string | null;
  pricing_region: string;
  created_at: Generated<Timestamptz>;
  updated_at: Generated<Timestamptz>;
  deactivated_at: Timestamptz | null;
  deleted_at: Timestamptz | null;
}

export interface ProviderTable {
  id: Generated<number>;
  abn: string;
  name: string;
  name_parts: Generated<string[]>; // populated by DB trigger, never write directly
  email: string | null;
  phone_number: string | null;
  address: string | null;
  unit_building: string | null;
  created_at: Generated<Timestamptz>;
  updated_at: Generated<Timestamptz>;
  deactivated_at: Timestamptz | null;
  deleted_at: Timestamptz | null;
}

export interface InvoiceTable {
  id: Generated<number>;
  client_id: number | null;
  provider_id: number | null;
  invoice_number: string | null;
  invoice_date: DateOnly | null;
  amount: Numeric | null;
  expected_amount: Numeric | null;
  status: Generated<"drafted" | "completed">;
  created_at: Generated<Timestamptz>;
  updated_at: Generated<Timestamptz>;
  deleted_at: Timestamptz | null;
}

export interface InvoiceItemTable {
  id: Generated<number>;
  invoice_id: number;
  rate_set_id: number | null;
  category_id: number | null;
  support_item_id: number | null;
  start_date: Timestamptz | null;
  end_date: Timestamptz | null;
  max_rate: Numeric | null;
  unit: Numeric | null;
  input_rate: Numeric | null;
  amount: Numeric | null;
  sort_order: Generated<number>;
  created_at: Generated<Timestamptz>;
  updated_at: Generated<Timestamptz>;
  deleted_at: Timestamptz | null;
}

export interface AppUserTable {
  id: Generated<number>;
  email: string;
  full_name: string;
  is_default: Generated<boolean>;
  created_at: Generated<Timestamptz>;
  updated_at: Generated<Timestamptz>;
  deactivated_at: Timestamptz | null;
  deleted_at: Timestamptz | null;
}

export interface AuthPasswordTable {
  user_id: number;
  password_hash: string;
  password_updated_at: Generated<Timestamptz>;
}

export interface RbacRoleTable {
  id: Generated<number>;
  code: string;
  label: string;
  is_default: Generated<boolean>;
  created_at: Generated<Timestamptz>;
  deactivated_at: Timestamptz | null;
}

export interface RbacPermissionTable {
  id: Generated<number>;
  code: string;
  label: string;
  created_at: Generated<Timestamptz>;
}

export interface RbacUserRoleTable {
  user_id: number;
  role_id: number;
  created_at: Generated<Timestamptz>;
}

export interface RbacUserRolePermissionTable {
  role_id: number;
  permission_id: number;
  created_at: Generated<Timestamptz>;
}

export interface AuthSessionTable {
  id: Generated<string>;
  user_id: number;
  role_id: number;
  token_hash: string;
  user_agent: string | null;
  ip: string | null;
  expires_at: Timestamptz;
  revoked_at: Timestamptz | null;
  created_at: Generated<Timestamptz>;
}

export interface AuditLogTable {
  id: Generated<string>;
  actor_user_id: number | null;
  actor_role_id: number | null;
  action: "create" | "update" | "delete";
  permission_code: string | null;
  entity: string;
  entity_id: string | null;
  payload: unknown | null;
  changes_diff: unknown | null;
  created_at: Generated<Timestamptz>;
}

export interface InvoiceUploadBatchTable {
  id: Generated<string>;
  uploaded_by: number;
  status: Generated<
    "uploading" | "uploaded" | "processing" | "completed" | "completed_with_errors" | "failed"
  >;
  file_count: number;
  total_size: number;
  error_message: string | null;
  created_at: Generated<Timestamptz>;
  updated_at: Generated<Timestamptz>;
}

export interface InvoiceUploadFileTable {
  id: Generated<string>;
  batch_id: string;
  original_name: string;
  object_key: string;
  content_type: string;
  size: number;
  etag: string;
  processing_status: Generated<
    "queued" | "processing" | "draft_created" | "needs_review" | "failed"
  >;
  attempt_count: Generated<number>;
  error_message: string | null;
  warnings: Generated<unknown>;
  extraction_result: unknown | null;
  invoice_id: number | null;
  ai_provider: "openai" | "openrouter" | null;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  processing_started_at: Timestamptz | null;
  processing_completed_at: Timestamptz | null;
  created_at: Generated<Timestamptz>;
  updated_at: Generated<Timestamptz>;
}

export interface Database {
  rate_set: RateSetTable;
  rate_set_category: RateSetCategoryTable;
  rate_set_support_item: RateSetSupportItemTable;
  rate_set_support_item_attribute_type: RateSetSupportItemAttributeTypeTable;
  rate_set_support_item_attribute: RateSetSupportItemAttributeTable;
  rate_set_support_item_type: RateSetSupportItemTypeTable;
  rate_set_support_item_pricing_region: RateSetSupportItemPricingRegionTable;
  rate_set_support_item_price: RateSetSupportItemPriceTable;
  gender: GenderTable;
  client: ClientTable;
  provider: ProviderTable;
  invoice: InvoiceTable;
  invoice_item: InvoiceItemTable;
  app_user: AppUserTable;
  auth_password: AuthPasswordTable;
  rbac_role: RbacRoleTable;
  rbac_permission: RbacPermissionTable;
  rbac_user_role: RbacUserRoleTable;
  rbac_user_role_permission: RbacUserRolePermissionTable;
  auth_session: AuthSessionTable;
  audit_log: AuditLogTable;
  invoice_upload_batch: InvoiceUploadBatchTable;
  invoice_upload_file: InvoiceUploadFileTable;
}
