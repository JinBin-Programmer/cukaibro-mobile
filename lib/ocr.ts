// On-device OCR for receipts.
//
// Uses `@react-native-ml-kit/text-recognition` (Google ML Kit, runs offline on
// the device — free and private). Native module → dev/production build only,
// not Expo Go. Required defensively so the app still runs in Expo Go without it.

let TextRecognition: { recognize: (uri: string) => Promise<{ text?: string }> } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  TextRecognition = require("@react-native-ml-kit/text-recognition").default ?? null;
} catch {
  TextRecognition = null;
}

export interface ReceiptOcr {
  rawText: string;
  amount?: number;
  date?: string; // YYYY-MM-DD
  merchant?: string;
}

export function isOcrAvailable(): boolean {
  return !!TextRecognition;
}

/** Run OCR on a receipt image and best-effort extract amount, date and merchant. */
export async function runReceiptOcr(uri: string): Promise<ReceiptOcr | null> {
  if (!TextRecognition) return null;
  const result = await TextRecognition.recognize(uri);
  const rawText = result?.text ?? "";
  return {
    rawText,
    amount: extractAmount(rawText),
    date: extractDate(rawText),
    merchant: extractMerchant(rawText),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

const MONEY_RE = /\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})|\d+\.\d{2}/g;
const TOTAL_KEYWORDS = ["grand total", "total amount", "amount due", "total due", "total", "jumlah", "amaun"];
// Subtotal/tax lines we should NOT treat as the grand total
const NEGATIVE_KEYWORDS = ["subtotal", "sub total", "sub-total", "change", "tendered", "cash", "rounding"];

function parseMoney(token: string): number {
  return parseFloat(token.replace(/[,\s]/g, ""));
}

function amountsInLine(line: string): number[] {
  const matches = line.match(MONEY_RE);
  return matches ? matches.map(parseMoney).filter((n) => !isNaN(n)) : [];
}

/**
 * Heuristic: prefer the amount on a "total"-type line (but not subtotal/change).
 * Fall back to the largest money value found anywhere.
 */
function extractAmount(text: string): number | undefined {
  const lines = text.split(/\r?\n/);
  const totalCandidates: number[] = [];
  const allCandidates: number[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    const nums = amountsInLine(line);
    if (nums.length === 0) continue;
    allCandidates.push(...nums);

    const isNegative = NEGATIVE_KEYWORDS.some((k) => lower.includes(k));
    const isTotal = !isNegative && TOTAL_KEYWORDS.some((k) => lower.includes(k));
    if (isTotal) totalCandidates.push(Math.max(...nums));
  }

  if (totalCandidates.length > 0) return Math.max(...totalCandidates);
  if (allCandidates.length > 0) return Math.max(...allCandidates);
  return undefined;
}

const DATE_RES: { re: RegExp; order: "dmy" | "ymd" }[] = [
  { re: /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/, order: "ymd" },
  { re: /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/, order: "dmy" },
];

function pad(n: string | number): string {
  return String(n).padStart(2, "0");
}

function extractDate(text: string): string | undefined {
  for (const { re, order } of DATE_RES) {
    const m = text.match(re);
    if (!m) continue;
    if (order === "ymd") {
      const [, y, mo, d] = m;
      return `${y}-${pad(mo)}-${pad(d)}`;
    }
    let [, d, mo, y] = m;
    if (y.length === 2) y = `20${y}`;
    const dd = parseInt(d, 10);
    const mm = parseInt(mo, 10);
    if (dd > 31 || mm > 12) continue;
    return `${y}-${pad(mm)}-${pad(dd)}`;
  }
  return undefined;
}

function extractMerchant(text: string): string | undefined {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 4)) {
    const letters = (line.match(/[A-Za-z]/g) || []).length;
    // First line that's mostly a name (has letters, not just numbers/dates)
    if (letters >= 3 && letters >= line.replace(/\s/g, "").length * 0.5) {
      return line.slice(0, 60);
    }
  }
  return undefined;
}
