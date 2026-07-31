export interface UserRecord {
  id: number;
  email: string;
  full_name: string;
  is_default: boolean;
  role_id: number | null;
  role_label: string | null;
  created_at: string;
  updated_at: string;
  deactivated_at: string | null;
}

export interface Role {
  id: number;
  code: string;
  label: string;
}
