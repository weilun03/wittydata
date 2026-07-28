export interface ProviderRecord {
  id: number;
  abn: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  unit_building: string | null;
  created_at: string;
  updated_at: string;
}
