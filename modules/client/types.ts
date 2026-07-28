export interface ClientRecord {
  id: number;
  first_name: string;
  last_name: string;
  gender_id: number;
  dob: string;
  ndis_number: string;
  email: string;
  phone_number: string | null;
  address: string;
  unit_building: string | null;
  pricing_region: string;
  created_at: string;
  updated_at: string;
}

export interface Gender {
  id: number;
  code: string;
  label: string;
}

export interface PricingRegion {
  code: string;
  label: string;
  full_label: string;
}
