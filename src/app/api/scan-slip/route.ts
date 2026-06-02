import { NextRequest, NextResponse } from "next/server";
import type { ScanReceiptResult } from "@/app/api/scan-receipt/route";

const FALLBACK: ScanReceiptResult = {
  amount: null,
  date: new Date().toISOString().slice(0, 10),
  category: "วัตถุดิบ",
  note: "จากสลิปธนาคาร",
  confidence: "unreadable",
};

/** Extract transfer amount from bank slip text.
 *  Priority: ยอดโอน / จำนวนเงิน / Amount / largest number */
function extractSlipAmount(text: string): number | null {
  const lines = text.split(/\r?\n/);

  // Thai bank keywords
  const thKeywords = [
    /ยอดโอน/,
    /จำนวนเงิน/,
    /ยอดชำระ/,
    /ยอดเงิน/,
    /โอนเงิน.*฿/,
  ];
  for (const kw of thKeywords) {
    for (const line of lines) {
      if (kw.test(line)) {
        const m = line.match(/[\d,]+\.?\d*/g);
        if (m) {
          const nums = m
            .map((s) => parseFloat(s.replace(/,/g, "")))
            .filter((n) => n >= 1 && n < 10_000_000);
          if (nums.length) return Math.max(...nums);
        }
      }
    }
  }

  // English keywords
  const enKeywords = [/amount\s*transferred/i, /transfer\s*amount/i, /\bamount\b/i];
  for (const kw of enKeywords) {
    for (const line of lines) {
      if (kw.test(line)) {
        const m = line.match(/[\d,]+\.?\d*/g);
        if (m) {
          const nums = m
            .map((s) => parseFloat(s.replace(/,/g, "")))
            .filter((n) => n >= 1 && n < 10_000_000);
          if (nums.length) return Math.max(...nums);
        }
      }
    }
  }

  // Fallback: largest number in text (ignore tiny numbers like dates)
  const allNums = (text.match(/[\d,]+\.?\d*/g) ?? [])
    .map((s) => parseFloat(s.replace(/,/g, "")))
    .filter((n) => n >= 10 && n < 10_000_000);
  if (allNums.length) return Math.max(...allNums);

  return null;
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
