import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";
import type { Receipt, ReliefCategory, TaxYear } from "./types";

const BUCKET = "receipts";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

/** Active relief categories (shared table with the web app). */
export async function listReliefCategories(): Promise<ReliefCategory[]> {
  const { data, error } = await supabase
    .from("relief_categories")
    .select("id, code, name, category_group, requires_receipt, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** A user's tax years, newest first. */
export async function listTaxYears(userId: string): Promise<TaxYear[]> {
  const { data, error } = await supabase
    .from("tax_years")
    .select("id, user_id, year")
    .eq("user_id", userId)
    .order("year", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Receipts for a user + tax year, with short-lived signed URLs resolved. */
export async function listReceipts(userId: string, taxYearId: string): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from("receipts")
    .select("*, category:relief_categories(id, code, name, category_group, requires_receipt, is_active, sort_order)")
    .eq("user_id", userId)
    .eq("tax_year_id", taxYearId)
    .order("receipt_date", { ascending: false });
  if (error) throw error;

  const receipts = (data ?? []) as Receipt[];
  await Promise.all(
    receipts.map(async (r) => {
      if (r.file_path && !r.file_path.startsWith("local://")) {
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(r.file_path, SIGNED_URL_TTL);
        r.signedUrl = signed?.signedUrl ?? null;
      }
    })
  );
  return receipts;
}

export interface UploadInput {
  userId: string;
  taxYearId: string | null;
  year: number;
  /** Local file URI from expo-image-picker. */
  uri: string;
  fileName: string;
  mimeType: string;
  amount: number;
  merchant: string;
  receiptDate: string; // YYYY-MM-DD
  reliefCategoryId: string | null;
  categoryCode: string | null;
  notes?: string;
}

/**
 * Upload a receipt file to the shared private bucket and insert its row.
 * Uses the SAME path convention as the web app:
 *   <user_id>/<year>/<category_code>/<timestamp>_<filename>
 */
export async function uploadReceipt(input: UploadInput): Promise<Receipt> {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const categoryCode = input.categoryCode || "general";
  const timestamp = Date.now();
  const filePath = `${input.userId}/${input.year}/${categoryCode}/${timestamp}_${safeName}`;

  // Read the local file and upload its bytes to Supabase Storage.
  const base64 = await FileSystem.readAsStringAsync(input.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const info = await FileSystem.getInfoAsync(input.uri);
  const fileSize = info.exists && "size" in info ? info.size : null;

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, decode(base64), {
      contentType: input.mimeType,
      upsert: false,
    });
  if (storageError) throw storageError;

  const { data, error: dbError } = await supabase
    .from("receipts")
    .insert({
      user_id: input.userId,
      tax_year_id: input.taxYearId,
      relief_category_id: input.reliefCategoryId,
      merchant: input.merchant.trim(),
      amount: input.amount,
      receipt_date: input.receiptDate,
      file_path: filePath,
      file_name: input.fileName,
      file_type: input.mimeType,
      file_size: fileSize,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();
  if (dbError) throw dbError;

  return data as Receipt;
}

/** Delete a receipt: removes the storage object then the row. */
export async function deleteReceipt(receipt: Receipt): Promise<void> {
  if (receipt.file_path && !receipt.file_path.startsWith("local://")) {
    await supabase.storage.from(BUCKET).remove([receipt.file_path]);
  }
  const { error } = await supabase.from("receipts").delete().eq("id", receipt.id);
  if (error) throw error;
}
