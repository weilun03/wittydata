export interface RoleRecord {
  id: number;
  code: string;
  label: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deactivated_at: string | null;
  permission_count: string;
}

export interface Permission {
  id: number;
  code: string;
  label: string;
}
