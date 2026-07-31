export interface AuthSessionRecord {
  id: string;
  user_id: number;
  email: string;
  full_name: string;
  role_label: string;
  user_agent: string | null;
  ip: string | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}
