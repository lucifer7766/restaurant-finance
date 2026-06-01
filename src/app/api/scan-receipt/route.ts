import { NextRequest, NextResponse } from "next/server";

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface ScanReceiptResult {
  amount: number | null;
  date: string | null;          // YYYY-MM-DD
  category: string | null;
  note: string | null;
  confidence: "high" | "low" | "unreadable";
}

const FALLBACK: ScanReceiptResult = {
  amount: null,
  date: new Date().toISOString().slice(0, 10),
  category: null,
  note: null,
  confidence: "unreadable",
};

const VALID_CATEGORIES = [
  "วัตถุดิบ",
  "ค่าแรง",
  "ค่าเช่า",
  "ค่าน้ำค่าไฟ",
  "การตลาด",
  "บรรจุภัณฑ์",
  "ซ่อมบำรุง",
  "อื่นๆ",
];

/* ── Text Parsers ────────────────────────────────────────────────────────── */

/** Extract amount — priority: GRAND TOTAL > TOTAL > largest number found */
function extractAmount(text: string): number | null {
  const lines = text.split(/\r?\n/);

  // 1. GRAND TOTAL
  for (const line of lines) {
    if (/grand\s*total/i.test(line)) {
      const m = line.match(/[\d,]+\.?\d*/g);
      if (m) {
        const nums = m.map((s) => parseFloat(s.replace(/,/g, ""))).filter((n) => n > 0);
        if (nums.length) return Math.max(...nums);
      }
    }
  }

  // 2. TOTAL (not subtotal)
  for (const line of lines) {
    if (/\btotal\b/i.test(line) && !/sub\s*total/i.test(line)) {
      const m = line.match(/[\d,]+\.?\d*/g);
      if (m) {
        const nums = m.map((s) => parseFloat(s.replace(/,/g, ""))).filter((n) => n > 0);
        if (nums.length) return Math.max(...nums);
      }
    }
  }

  // 3. Largest number in the whole text
  const allNums = (text.match(/[\d,]+\.?\d*/g) ?? [])
    .map((s) => parseFloat(s.replace(/,/g, "")))
    .filter((n) => n >= 1 && n < 10_000_000);
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
  return year > 2400 ? year - 543 : year;
}

/** Extract date — supports dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, dd Mon yyyy, dd เดือน yyyy */
function extractDate(text: string): string | null {
  const today = new Date().toISOString().slice(0, 10);

  // yyyy-mm-dd or yyyy/mm/dd (may be BE year)
  const iso = text.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (iso) {
    const year = beToce(parseInt(iso[1]));
    return `${year}-${iso[2]}-${iso[3]}`;
  }

  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (dmy) {
    const y = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    const year = beToce(parseInt(y));
    return `${year}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`;
  }

  // dd Mon yyyy — e.g. "25 Aug 2562" or "25 August 2019"
  const enMon = text.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (enMon) {
    const mo = EN_MONTHS[enMon[2].toLowerCase().slice(0,3)];
    if (mo) {
      const year = beToce(parseInt(enMon[3]));
      return `${year}-${mo}-${enMon[1].padStart(2,"0")}`;
    }
  }

  // dd เดือนไทย yyyy — e.g. "25 สิงหาคม 2562" or "25 ส.ค. 2562"
  for (const [thName, mo] of Object.entries(TH_MONTHS)) {
    const re = new RegExp(`(\\d{1,2})\\s*${thName}\\s*(\\d{4})`);
    const m = text.match(re);
    if (m) {
      const year = beToce(parseInt(m[2]));
      return `${year}-${mo}-${m[1].padStart(2,"0")}`;
    }
  }

  return today;
}

/** Guess category from keywords in text */
function extractCategory(text: string): string | null {
  const lower = text.toLowerCase();
  if (/เนื้อ|หมู|ไก่|ปลา|ผัก|วัตถุดิบ|ingredient|meat|produce|grocery|food\s*supply/i.test(lower))
    return "วัตถุดิบ";
  if (/เช่า|ค่าเช่า|rent/i.test(lower)) return "ค่าเช่า";
  if (/ไฟฟ้า|น้ำประปา|utility|electric|water\s*bill|pea|mwa/i.test(lower)) return "ค่าน้ำค่าไฟ";
  if (/เงินเดือน|ค่าแรง|salary|wage|labor/i.test(lower)) return "ค่าแรง";
  if (/โฆษณา|การตลาด|marketing|facebook|instagram|ads/i.test(lower)) return "การตลาด";
  if (/บรรจุภัณฑ์|กล่อง|ถุง|packaging|box|bag/i.test(lower)) return "บรรจุภัณฑ์";
  if (/ซ่อม|repair|maintenance|fix/i.test(lower)) return "ซ่อมบำรุง";
  return null;
}

/** First non-empty line as note */
function extractNote(text: string): string | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines[0] ?? null;
}

/* ── POST Handler ────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  /* 1. Check API key */
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    console.error("OCR_SPACE_API_KEY not configured");
    return NextResponse.json(
      { ...FALLBACK, error: "OCR_SPACE_API_KEY not configured" },
      { status: 200 }
    );
  }

  /* 2. Parse body */
  let image: string;
  let mimeType: string;
  try {
    const body = await req.json();
    image = body.image;
    mimeType = body.mimeType ?? "image/jpeg";
    if (!image) throw new Error("missing image");
  } catch {
    console.error("scan-receipt: bad request body");
    return NextResponse.json(FALLBACK, { status: 200 });
  }

  /* 3. Call OCR.Space */
  try {
    const formData = new URLSearchParams();
    formData.append("base64Image", `data:${mimeType};base64,${image}`);
    formData.append("apikey", apiKey);
    formData.append("language", "tha");          // Thai + English
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2");           // Engine 2 is more accurate

    const ocrRes = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      signal: AbortSignal.timeout(20000),
    });

    if (!ocrRes.ok) {
      console.error("OCR.Space HTTP error:", ocrRes.status, await ocrRes.text());
      return NextResponse.json(FALLBACK, { status: 200 });
    }

    /* 4. Parse OCR response */
    const ocrData = await ocrRes.json();
    console.log("OCR.Space raw:", JSON.stringify(ocrData).slice(0, 500));

    if (ocrData.IsErroredOnProcessing) {
      console.error("OCR.Space processing error:", ocrData.ErrorMessage);
      return NextResponse.json(FALLBACK, { status: 200 });
    }

    const rawText: string =
      ocrData?.ParsedResults?.[0]?.ParsedText ?? "";

    if (!rawText.trim()) {
      return NextResponse.json(FALLBACK, { status: 200 });
    }

    /* 5. Extract fields */
    const amount   = extractAmount(rawText);
    const date     = extractDate(rawText);
    const category = extractCategory(rawText);
    const note     = extractNote(rawText);

    const confidence: ScanReceiptResult["confidence"] =
      amount !== null ? "high" : rawText.length > 20 ? "low" : "unreadable";

    const result: ScanReceiptResult = {
      amount,
      date,
      category,
      note,
      confidence,
    };

    console.log("scan-receipt result:", JSON.stringify(result));
    return NextResponse.json(result, { status: 200 });

  } catch (err) {
    console.error("scan-receipt error:", err);
    return NextResponse.json(FALLBACK, { status: 200 });
  }
}
