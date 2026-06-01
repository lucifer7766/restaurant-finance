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

/* ── Prompt ──────────────────────────────────────────────────────────────── */

const PROMPT = `You are a receipt OCR assistant for a Thai restaurant finance system.
Analyze this receipt image and extract the following fields as JSON.

Rules:
- amount: total amount as a number (no currency symbol). null if not found.
- date: date in YYYY-MM-DD format. null if not found.
- category: pick the best match from this list ONLY: ${VALID_CATEGORIES.join(", ")}. null if unclear.
- note: short description of what was purchased (Thai or English). null if not found.
- confidence: "high" if you can read most fields clearly, "low" if partially readable, "unreadable" if image is too unclear.

Respond with ONLY valid JSON, no markdown, no explanation:
{"amount":null,"date":null,"category":null,"note":null,"confidence":"unreadable"}`;

/* ── Validate parsed result ──────────────────────────────────────────────── */

function validate(raw: unknown): ScanReceiptResult {
  if (!raw || typeof raw !== "object") return FALLBACK;
  const r = raw as Record<string, unknown>;

  const amount =
    typeof r.amount === "number" && r.amount > 0 ? r.amount : null;

  const date =
    typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date)
      ? r.date
      : new Date().toISOString().slice(0, 10);

  const category =
    typeof r.category === "string" && VALID_CATEGORIES.includes(r.category)
      ? r.category
      : null;

  const note = typeof r.note === "string" && r.note.trim() ? r.note.trim() : null;

  const confidence =
    r.confidence === "high" || r.confidence === "low"
      ? r.confidence
      : "unreadable";

  return { amount, date, category, note, confidence };
}

/* ── POST Handler ────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  /* 1. Check API key */
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ...FALLBACK, error: "GEMINI_API_KEY not configured" },
      { status: 200 } // return 200 so client shows modal with fallback
    );
  }

  /* 2. Parse body */
  let image: string;
  let mimeType: string;
  try {
    const body = await req.json();
    image = body.image;       // base64 string (without data:... prefix)
    mimeType = body.mimeType ?? "image/jpeg";
    if (!image) throw new Error("missing image");
  } catch {
    return NextResponse.json(FALLBACK, { status: 200 });
  }

  /* 3. Call Gemini */
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                { inline_data: { mime_type: mimeType, data: image } },
              ],
            },
          ],
          generationConfig: { temperature: 0, maxOutputTokens: 256 },
        }),
        signal: AbortSignal.timeout(15000), // 15s timeout
      }
    );

    if (!geminiRes.ok) {
      console.error("Gemini API error:", geminiRes.status);
      return NextResponse.json(FALLBACK, { status: 200 });
    }

    /* 4. Parse Gemini response */
    const geminiData = await geminiRes.json();
    const text: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Strip markdown code fences if present
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    /* 5. Validate and return */
    return NextResponse.json(validate(parsed), { status: 200 });
  } catch (err) {
    console.error("scan-receipt error:", err);
    return NextResponse.json(FALLBACK, { status: 200 });
  }
}
