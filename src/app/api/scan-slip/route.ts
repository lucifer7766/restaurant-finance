import { NextRequest, NextResponse } from "next/server";
import type { ScanReceiptResult } from "@/app/api/scan-receipt/route";

const FALLBACK: ScanReceiptResult = {
  amount: null,
  date: new Date().toISOString().slice(0, 10),
  category: "วัตถุดิบ",
  note: "จากสลิปธนาคาร",
  confidence: "unreadable",
};

/**
 * Extract transfer amount from bank slip OCR text.
 *
 * Strategy (two phases, no Math.max fallback):
 *   Phase 1 – Label keywords: "Amount:", "จำนวนเงิน", etc.
 *             → check same line, then next line (handles two-line KBank format)
 *   Phase 2 – Inline currency words: "Baht", "บาท", "฿"
 *             → same-line only (currency word sits beside the number)
 *
 * Never reads from: Transaction ID / Reference ID / account numbers / fee lines.
 *
 * Root-cause fix vs. previous version:
 *   Old isIdLine() matched ANY word ≥ 6 chars (e.g. "Amount", "Payment"),
 *   which caused the "Amount:" keyword line to be silently skipped and its
 *   next-line value ("60.00 Baht") to be ignored.
 *   New isValueNoiseLine() only flags actual ID/account tokens.
 */
function extractSlipAmount(text: string): number | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  // ── helpers ────────────────────────────────────────────────────────────────

  /**
   * True only for lines that contain actual reference/account ID values.
   * Does NOT match normal English words like "Amount", "Payment", "Completed".
   */
  function isValueNoiseLine(line: string): boolean {
    // Alphanumeric ID token: letter(s) immediately adjacent to 5+ digits
    // e.g. "016153204847APM18899", "E33982c4e13264328", "TXN123456"
    if (/[A-Za-z]\d{5,}|\d{5,}[A-Za-z]/.test(line)) return true;
    // Pure digit account/phone numbers (10+ consecutive digits)
    if (/\d{10,}/.test(line)) return true;
    // Explicit reference label lines (label only, no amount expected here)
    if (/^(transaction\s*id|reference|ref|รหัส|เลขที่รายการ|order\s*id)\s*:?\s*$/i.test(line)) return true;
    return false;
  }

  /** True when this line is a fee/charge label or its adjacent value line. */
  function isFeeLabel(line: string): boolean {
    return /\bfee\b|ค่าธรรมเนียม|ค่าบริการ|\bcharge\b/i.test(line);
  }

  /**
   * Extract the first plausible monetary amount from a line.
   * Strips date/time patterns and currency words before scanning.
   * Returns null if the line looks like an ID/noise line.
   */
  function getMoney(line: string): number | null {
    if (isValueNoiseLine(line)) return null;

    // Remove currency/unit words so they don't interfere with number detection
    let s = line
      .replace(/\b(baht|thb)\b/gi, " ")
      .replace(/บาท/g, " ")
      .replace(/฿/g, " ");

    // Remove time patterns: "8:48 PM", "12:30"
    s = s.replace(/\b\d{1,2}:\d{2}(?:\s*(?:am|pm))?\b/gi, " ");

    // Remove date patterns: "2 Jun 26", "15 Jan 2024"
    s = s.replace(
      /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4}\b/gi,
      " "
    );

    // Prefer decimal numbers (monetary amounts almost always have .xx)
    const dec = s.match(/\b[\d,]+\.\d{1,2}\b/g);
    if (dec) {
      const nums = dec
        .map((n) => parseFloat(n.replace(/,/g, "")))
        .filter((n) => n >= 0.01 && n < 10_000_000);
      if (nums.length) return nums[0];
    }

    // Plain integers (avoid 4-digit years that look like amounts)
    const ints = s.match(/\b[\d,]+\b/g);
    if (ints) {
      const nums = ints
        .map((n) => parseFloat(n.replace(/,/g, "")))
        .filter((n) => n >= 1 && n < 1_000_000 && !/^(19|20)\d{2}$/.test(n.toString()));
      if (nums.length) return nums[0];
    }

    return null;
  }

  // ── pre-compute fee line indices ───────────────────────────────────────────
  // Fee lines AND their immediate next line (which holds "0.00 Baht") are excluded.
  const feeLines = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (isFeeLabel(lines[i])) {
      feeLines.add(i);
      feeLines.add(i + 1);
    }
  }

  const candidates: number[] = [];

  // ── Phase 1: label keywords ───────────────────────────────────────────────
  // These words act as labels; the amount can be on the same line OR the next.
  const labelKeywords: RegExp[] = [
    /จำนวนเงิน/,
    /ยอดโอน/,
    /ยอดชำระ/,
    /ยอดเงิน/,
    /โอนเงิน/,
    /amount\s*transferred/i,
    /transfer(?:red)?\s*amount/i,
    /\bamount\b/i,
    /\btotal\b/i,
    /\bรวม\b/,
    /\bthb\b/i,
  ];

  for (const kw of labelKeywords) {
    for (let i = 0; i < lines.length; i++) {
      if (feeLines.has(i)) continue;
      if (!kw.test(lines[i])) continue;

      // Same line (e.g. "Amount: 60.00" or "ยอดเงิน 60.00")
      const v = getMoney(lines[i]);
      if (v !== null && v > 0) {
        candidates.push(v);
        continue;
      }

      // Next line (e.g. "Amount:\n60.00 Baht")
      if (i + 1 < lines.length && !feeLines.has(i + 1)) {
        const nv = getMoney(lines[i + 1]);
        if (nv !== null && nv > 0) candidates.push(nv);
      }
    }
    if (candidates.length) break; // stop at first matching keyword
  }

  // ── Phase 2: inline currency keywords (same line only) ────────────────────
  // Only used when Phase 1 found nothing.
  if (!candidates.length) {
    const inlineKeywords: RegExp[] = [/baht/i, /บาท/, /฿/];
    for (const kw of inlineKeywords) {
      for (let i = 0; i < lines.length; i++) {
        if (feeLines.has(i)) continue;
        if (!kw.test(lines[i])) continue;
        const v = getMoney(lines[i]);
        if (v !== null && v > 0) candidates.push(v);
      }
      if (candidates.length) break;
    }
  }

  return candidates[0] ?? null;
}

const EN_MONTHS: Record<string, string> = {
  jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
  jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
};
const TH_MONTHS: Record<string, string> = {
  มกราคม:"01",กุมภาพันธ์:"02",มีนาคม:"03",เมษายน:"04",
  พฤษภาคม:"05",มิถุนายน:"06",กรกฎาคม:"07",สิงหาคม:"08",
  กันยายน:"09",ตุลาคม:"10",พฤศจิกายน:"11",ธันวาคม:"12",
  "ม.ค.":"01","ก.พ.":"02","มี.ค.":"03","เม.ย.":"04",
  "พ.ค.":"05","มิ.ย.":"06","ก.ค.":"07","ส.ค.":"08",
  "ก.ย.":"09","ต.ค.":"10","พ.ย.":"11","ธ.ค.":"12",
};

function beToce(year: number): number {
  if (year > 2400) return year - 543;
  if (year >= 2043 && year <= 2099) return year - 43;
  return year;
}

function extractSlipDate(text: string): string | null {
  const today = new Date().toISOString().slice(0, 10);

  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmy) {
    const y = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    const year = beToce(parseInt(y));
    return `${year}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  // yyyy-mm-dd
  const iso = text.match(/(\d{4})[-\/](\d{2})[-\/](\d{2})/);
  if (iso) {
    const year = beToce(parseInt(iso[1]));
    return `${year}-${iso[2]}-${iso[3]}`;
  }

  // dd Mon yyyy
  const enMon = text.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (enMon) {
    const mo = EN_MONTHS[enMon[2].toLowerCase().slice(0, 3)];
    if (mo) {
      const year = beToce(parseInt(enMon[3]));
      return `${year}-${mo}-${enMon[1].padStart(2, "0")}`;
    }
  }

  // dd เดือนไทย yyyy
  for (const [thName, mo] of Object.entries(TH_MONTHS)) {
    const re = new RegExp(`(\\d{1,2})\\s*${thName}\\s*(\\d{4})`);
    const m = text.match(re);
    if (m) {
      const year = beToce(parseInt(m[2]));
      return `${year}-${mo}-${m[1].padStart(2, "0")}`;
    }
  }

  return today;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ...FALLBACK, error: "OCR_SPACE_API_KEY not configured" },
      { status: 200 }
    );
  }

  let image: string;
  let mimeType: string;
  try {
    const body = await req.json();
    image = body.image;
    mimeType = body.mimeType ?? "image/jpeg";
    if (!image) throw new Error("missing image");
  } catch {
    return NextResponse.json(FALLBACK, { status: 200 });
  }

  try {
    const formData = new URLSearchParams();
    formData.append("base64Image", `data:${mimeType};base64,${image}`);
    formData.append("apikey", apiKey);
    formData.append("language", "tha");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2");

    const ocrRes = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      signal: AbortSignal.timeout(20000),
    });

    if (!ocrRes.ok) return NextResponse.json(FALLBACK, { status: 200 });

    const ocrData = await ocrRes.json();
    if (ocrData.IsErroredOnProcessing) return NextResponse.json(FALLBACK, { status: 200 });

    const rawText: string = ocrData?.ParsedResults?.[0]?.ParsedText ?? "";
    if (!rawText.trim()) return NextResponse.json(FALLBACK, { status: 200 });

    const amount = extractSlipAmount(rawText);
    const date = extractSlipDate(rawText);
    const confidence: ScanReceiptResult["confidence"] =
      amount !== null ? "high" : rawText.length > 20 ? "low" : "unreadable";

    return NextResponse.json(
      {
        amount,
        date,
        category: "วัตถุดิบ",
        note: "จากสลิปธนาคาร",
        confidence,
      } satisfies ScanReceiptResult,
      { status: 200 }
    );
  } catch {
    return NextResponse.json(FALLBACK, { status: 200 });
  }
}
