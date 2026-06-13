// Subset of the web app's lib/types.ts — only what the mobile app needs.
// These mirror the shared Supabase tables exactly.

export interface ReliefCategory {
  id: string;
  code: string;
  name: string;
  category_group: string;
  requires_receipt: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface TaxYear {
  id: string;
  user_id: string;
  year: number;
}

export interface Receipt {
  id: string;
  user_id: string;
  tax_year_id: string | null;
  relief_category_id: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  amount: number | null;
  merchant: string | null;
  receipt_date: string | null;
  notes: string | null;
  created_at: string;
  category?: ReliefCategory | null;
  // Resolved client-side from the private bucket (not stored in DB):
  signedUrl?: string | null;
}
