"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";

/* ── Normalized row ── */

interface NormalizedRow {
  date: string;
  transactionId: string;
  type: "Income" | "Expense";
  category: string;
  description?: string;
  paymentMethod: string;
  quantity?: number;
  amount: number;
}

/* ── Exported types ── */

export interface PosGroup {
  date: string;
  category: string;
  amount: number;
  count: number;
  paymentSummary: string;
}

export interface PaymentBreakdown {
  cash: number;
  transfer: number;
  card: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (groups: PosGroup[], payment: PaymentBreakdown) => Promise<void>;
}

/* ── Column name candidates ── */

const COL = {
  date:    ["date", "วันที่", "transaction_date", "transaction date", "sale_date", "sale date"],
  id:      ["transaction_id", "transaction id", "bill_no", "order_id", "เลขบิล", "เลขออเดอร์"],
  type:    ["type", "ประเภท", "รายรับรายจ่าย"],
  cat:     ["category", "หมวดหมู่", "product_category", "product category", "sales_category", "sales category"],
  desc:    ["description", "item", "menu", "รายการ", "ชื่อเมนู"],
  payment: ["payment_method", "payment method", "payment", "ช่องทางชำระเงิน", "payment_type", "payment type"],
  qty:     ["quantity", "qty", "จำนวน"],
  amount:  ["amount thb", "amount_thb", "amount", "total", "ยอดขาย", "จำนวนเงิน", "net_sales", "net sales", "gross_sales", "gross sales"],
};

function findCol(headers: string[], candidates: string[]): string | null {
  for (const h of headers) {
    if (candidates.includes(h.trim().toLowerCase())) return h;
  }
  return null;
}

/* ── Date parse ── */

function parseDate(raw: string | number): string {
  if (typeof raw === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
  }
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

/* ── Payment mapping ── */

function mapPayment(raw: string): string {
  const v = (raw || "").trim().toLowerCase();
  if (["cash", "เงินสด"].includes(v)) return "เงินสด";
  if (["transfer", "โอน", "โอนเงิน", "bank transfer"].includes(v)) return "โอนเงิน";
  if (["card", "credit_card", "creditcard", "credit card", "บัตรเครดิต", "debit card"].includes(v)) return "บัตรเครดิต";
  return raw.trim() || "เงินสด";
}

/* ── Parse rows from 2D array (shared by CSV and XLSX) ── */

function parseRows(data: unknown[][]): { rows: NormalizedRow[]; skippedCount: number } {
  if (data.length < 2) throw new Error("ไฟล์ต้องมีหัวตารางและข้อมูลอย่างน้อย 1 แถว");

  const headers = (data[0] as string[]).map((h) => String(h ?? "").trim());

  const dateCol    = findCol(headers, COL.date);
  const idCol      = findCol(headers, COL.id);
  const typeCol    = findCol(headers, COL.type);
  const catCol     = findCol(headers, COL.cat);
  const descCol    = findCol(headers, COL.desc);
  const payCol     = findCol(headers, COL.payment);
  const qtyCol     = findCol(headers, COL.qty);
  const amtCol     = findCol(headers, COL.amount);

  if (!amtCol) throw new Error("ไม่พบคอลัมน์ยอดเงิน (Amount / total / ยอดขาย)");

  const rows: NormalizedRow[] = [];
  let skippedCount = 0;

  data.slice(1).forEach((cells, i) => {
    const get = (col: string | null): string => {
      if (!col) return "";
      const idx = headers.indexOf(col);
      return String(cells[idx] ?? "").trim();
    };
    const getRaw = (col: string | null): unknown => {
      if (!col) return "";
      return cells[headers.indexOf(col)];
    };

    const amtRaw = get(amtCol).replace(/[,฿\s]/g, "");
    const amount = parseFloat(amtRaw);
    if (isNaN(amount) || amount <= 0) { skippedCount++; return; }

    const typeRaw = get(typeCol).toLowerCase();
    const rowType: "Income" | "Expense" =
      typeRaw.includes("expense") || typeRaw.includes("รายจ่าย") ? "Expense" : "Income";

    rows.push({
      date:          dateCol  ? parseDate(getRaw(dateCol) as string | number) : new Date().toISOString().slice(0, 10),
      transactionId: idCol    ? get(idCol) : `POS-${i + 1}`,
      type:          rowType,
      category:      catCol   ? (get(catCol) || "ยอดขาย POS") : "ยอดขาย POS",
      description:   descCol  ? get(descCol) : undefined,
      paymentMethod: payCol   ? mapPayment(get(payCol)) : "เงินสด",
      quantity:      qtyCol   ? Number(get(qtyCol)) || undefined : undefined,
      amount,
    });
  });

  if (rows.length === 0) throw new Error("ไม่พบข้อมูลที่ใช้ได้ในไฟล์");
  return { rows, skippedCount };
}

/* ── File parsers ── */

function parseCsvText(text: string): { rows: NormalizedRow[]; skippedCount: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const data = lines.map((line) =>
    line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
  );
  return parseRows(data);
}

function parseExcelBuffer(buffer: ArrayBuffer): { rows: NormalizedRow[]; skippedCount: number } {
  const wb = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase() === "pos_transactions") ??
    wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  return parseRows(data as unknown[][]);
}

/* ── Group by category ── */

function groupByCategory(rows: NormalizedRow[]): PosGroup[] {
  const map = new Map<string, { amount: number; count: number; date: string; payments: Set<string> }>();
  for (const row of rows) {
    const existing = map.get(row.category);
    if (existing) {
      existing.amount += row.amount;
      existing.count  += 1;
      existing.payments.add(row.paymentMethod);
    } else {
      map.set(row.category, {
        amount:   row.amount,
        count:    1,
        date:     row.date,
        payments: new Set([row.paymentMethod]),
      });
    }
  }
  return Array.from(map.entries()).map(([category, v]) => ({
    category,
    amount:         v.amount,
    count:          v.count,
    date:           v.date,
    paymentSummary: v.payments.size === 1 ? [...v.payments][0] : "รวมหลายช่องทาง",
  }));
}

/* ── Payment summary ── */

function calcPaymentSummary(rows: NormalizedRow[]) {
  const total    = rows.reduce((s, r) => s + r.amount, 0);
  const cash     = rows.filter((r) => r.paymentMethod === "เงินสด").reduce((s, r) => s + r.amount, 0);
  const transfer = rows.filter((r) => r.paymentMethod === "โอนเงิน").reduce((s, r) => s + r.amount, 0);
  const card     = rows.filter((r) => r.paymentMethod === "บัตรเครดิต").reduce((s, r) => s + r.amount, 0);
  return { total, cash, transfer, card, count: rows.length };
}

function fmt(n: number) {
  return `฿${n.toLocaleString("th-TH")}`;
}

/* ── Component ── */

export function PosImportModal({ open, onClose, onConfirm }: Props) {
  const [rawRows, setRawRows]         = useState<NormalizedRow[]>([]);
  const [groups, setGroups]           = useState<PosGroup[]>([]);
  const [parseError, setParseError]   = useState<string | null>(null);
  const [importing, setImporting]     = useState(false);
  const [fileName, setFileName]       = useState<string | null>(null);
  const [skippedRows, setSkippedRows] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function handleClose() {
    setRawRows([]);
    setGroups([]);
    setParseError(null);
    setFileName(null);
    setSkippedRows(0);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  }

  function handleFile(file: File) {
    setParseError(null);
    setRawRows([]);
    setGroups([]);
    setFileName(file.name);

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const { rows, skippedCount } = parseCsvText(e.target?.result as string);
          const incomeRows = rows.filter((r) => r.type === "Income");
          setRawRows(incomeRows);
          setGroups(groupByCategory(incomeRows));
          setSkippedRows(skippedCount);
        } catch (err) {
          setParseError(err instanceof Error ? err.message : "อ่านไฟล์ไม่สำเร็จ");
        }
      };
      reader.readAsText(file, "utf-8");
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const { rows, skippedCount } = parseExcelBuffer(e.target?.result as ArrayBuffer);
          const incomeRows = rows.filter((r) => r.type === "Income");
          setRawRows(incomeRows);
          setGroups(groupByCategory(incomeRows));
          setSkippedRows(skippedCount);
        } catch (err) {
          setParseError(err instanceof Error ? err.message : "อ่านไฟล์ไม่สำเร็จ");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setParseError("รองรับเฉพาะ .csv, .xlsx, .xls เท่านั้น");
    }
  }

  async function handleConfirm() {
    setImporting(true);
    try {
      const s = calcPaymentSummary(rawRows);
      await onConfirm(groups, { cash: s.cash, transfer: s.transfer, card: s.card });
      handleClose();
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setImporting(false);
    }
  }

  const summary = rawRows.length > 0 ? calcPaymentSummary(rawRows) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
      <div className="w-full sm:max-w-lg bg-surface sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary-container text-[20px]">upload_file</span>
          </div>
          <div className="flex-1">
            <h3 className="font-headline-md text-headline-md text-on-surface">นำเข้ารายงาน POS</h3>
            <p className="font-label-caps text-label-caps text-on-surface-variant">รองรับ CSV, XLSX, XLS</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 pb-4 space-y-4">

          {/* Upload zone */}
          <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-colors ${groups.length > 0 ? "border-primary bg-primary-container/20" : "border-outline-variant hover:border-primary hover:bg-surface-container"}`}>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <span className="material-symbols-outlined text-on-surface-variant text-[32px]">
              {groups.length > 0 ? "check_circle" : "upload_file"}
            </span>
            <p className="font-body-md text-on-surface text-center">
              {fileName ?? "แตะเพื่อเลือกไฟล์"}
            </p>
            <p className="text-xs text-on-surface-variant">CSV · XLSX · XLS</p>
            {groups.length > 0 && (
              <p className="font-label-caps text-label-caps text-primary">
                พบ {rawRows.length} รายการ → {groups.length} หมวดหมู่
              </p>
            )}
          </label>

          {/* Error */}
          {parseError && (
            <div className="p-4 rounded-xl bg-error-container flex items-start gap-2">
              <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">error</span>
              <p className="font-body-md text-on-surface text-sm">{parseError}</p>
            </div>
          )}

          {/* Skipped rows warning */}
          {skippedRows > 0 && (
            <div className="p-4 rounded-xl bg-tertiary-container flex items-start gap-2">
              <span className="material-symbols-outlined text-on-tertiary-fixed-variant text-[18px] shrink-0 mt-0.5">warning</span>
              <p className="font-body-md text-on-surface text-sm">
                มี {skippedRows} แถวที่ถูกข้าม เพราะยอดขายไม่ถูกต้องหรือเป็น 0
              </p>
            </div>
          )}

          {/* Payment Summary */}
          {summary && (
            <div className="metric-card p-5 rounded-2xl space-y-3">
              <p className="font-label-caps text-label-caps text-on-surface-variant">สรุปยอดทั้งหมด</p>
              <div className="flex items-baseline gap-1 text-primary">
                <span className="text-base font-bold opacity-50">฿</span>
                <span className="text-3xl font-bold font-headline-md tracking-tight">
                  {summary.total.toLocaleString("th-TH")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { label: "เงินสด",       value: fmt(summary.cash) },
                  { label: "โอนเงิน",      value: fmt(summary.transfer) },
                  { label: "บัตรเครดิต",  value: fmt(summary.card) },
                  { label: "จำนวนรายการ", value: `${summary.count} รายการ` },
                ].map((item) => (
                  <div key={item.label} className="bg-surface-container rounded-xl px-3 py-2">
                    <p className="text-xs text-on-surface-variant mb-0.5">{item.label}</p>
                    <p className="font-semibold text-sm text-on-surface">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview by category */}
          {groups.length > 0 && (
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">
                รายการที่จะบันทึก ({groups.length} หมวดหมู่)
              </p>
              <div className="space-y-2">
                {groups.map((g, i) => (
                  <div key={i} className="metric-card px-4 py-3 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-on-primary-container text-[16px]">sell</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-on-surface text-sm font-medium">{g.category}</p>
                      <p className="text-xs text-on-surface-variant">{g.date} · {g.count} รายการ · {g.paymentSummary}</p>
                    </div>
                    <p className="font-semibold text-sm text-primary whitespace-nowrap shrink-0">{fmt(g.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-3 flex gap-3 shrink-0 border-t border-surface-container-low">
          <button onClick={handleClose} className="btn-secondary flex-1">ยกเลิก</button>
          <button
            onClick={handleConfirm}
            disabled={groups.length === 0 || importing}
            className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">
              {importing ? "hourglass_top" : "check_circle"}
            </span>
            {importing ? "กำลังบันทึก..." : `ยืนยันนำเข้า ${groups.length} หมวด`}
          </button>
        </div>

      </div>
    </div>
  );
}
