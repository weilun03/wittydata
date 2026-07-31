export interface InvoiceItemRecord {
  id: number;
  invoice_id: number;
  rate_set_id: number | null;
  category_id: number | null;
  support_item_id: number | null;
  start_date: string | null;
  end_date: string | null;
  max_rate: string | null;
  unit: string | null;
  input_rate: string | null;
  amount: string | null;
  sort_order: number;
}

export interface InvoiceRecord {
  id: number;
  client_id: number | null;
  provider_id: number | null;
  invoice_number: string | null;
  invoice_date: string | null;
  amount: string | null;
  expected_amount: string | null;
  status: "drafted" | "completed";
  created_at: string;
  updated_at: string;
  items: InvoiceItemRecord[];
}

export interface InvoiceListRow {
  id: number;
  client_id: number | null;
  provider_id: number | null;
  client_name: string | null;
  provider_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  amount: string | null;
  expected_amount: string | null;
  status: "drafted" | "completed";
  created_at: string;
  updated_at: string;
}

export interface RateSetCategoryOption {
  id: number;
  category_number: string;
  category_name: string;
}

export interface SupportItemOption {
  id: number;
  item_number: string;
  item_name: string;
  unit: string | null;
}
