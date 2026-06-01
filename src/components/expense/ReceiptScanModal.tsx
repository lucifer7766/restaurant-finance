"use client";

import { useState, useEffect } from "react";

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface ScanResult {
  amount: number | null;
  date: string | null;
  category: string | null;
  note: string | null;
  confidence: "high" | "low" | "unreadable";
}

export interface ConfirmedExpense {
  amount: number;
  date: string;
  category: string;
  note: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: ConfirmedExpense) => void;
  initialData: ScanResult | null;
}

const EXPENSE_CATEGORIES = [
  "วัตถุดิบ",
  "ค่าแรง",
  "ค่าเช่า",
  "ค่าน้ำค่าไฟ",
  "การตลาด",
  "บรรจุภัณฑ์",
  "ซ่อมบำรุง",
  "อื่นๆ",
];

const TODAY = new Date().toISOString().slice(0, 10);

/* ── Component ───────────────────────────────────────────────────────────── */

export function ReceiptScanModal({ open, onClose, onConfirm, initialData }: Props) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(TODAY);
  const [category, setCategory] = useState("วัตถุดิบ");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  /* Sync when initialData changes */
  useEffect(() => {
    if (!open) return;
    setAmount(initialData?.amount != null ? String(initialData.amount) : "");
    setDate(initialData?.date ?? TODAY);
    setCategory(initialData?.category ?? "วัตถุดิบ");
    setNote(initialData?.note ?? "");
    setError(null);
  }, [open, initialData]);

  if (!open) return null;

  function handleConfirm() {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError("กรุณากรอกจำนวนเงิน"); return; }
    if (!date) { setError("กรุณาเลือกวันที่"); return; }
    setError(null);
    onConfirm({ amount: amt, date, category, note });
  }

  const isUnreadable = initialData?.confidence === "unreadable";

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-surface rounded-3xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary-container text-[20px]">receipt_long</span>
          </div>
          <div className="flex-1">
            <h3 className="font-headline-md text-headline-md text-on-surface">ยืนยันรายจ่าย</h3>
            <p className="font-label-caps text-label-caps text-on-surface-variant">
              {isUnreadable ? "อ่านใบเสร็จไม่ได้ — กรุณากรอกเอง" : "ตรวจสอบและแก้ไขข้อมูลก่อนบันทึก"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Confidence banner */}
        {!isUnreadable && initialData?.confidence === "low" && (
          <div className="mx-6 mb-4 px-4 py-2 bg-tertiary-container rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-on-tertiary-fixed-variant text-[16px]">warning</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">อ่านได้บางส่วน กรุณาตรวจสอบ</span>
          </div>
        )}

        {/* Form */}
        <div className="px-6 pb-6 space-y-4">

          {/* Amount */}
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">จำนวนเงิน (บาท)</label>
            <div className="flex items-center gap-2 bg-surface-container rounded-xl px-4 py-3 border border-outline-variant focus-within:border-primary transition-colors">
              <span className="text-xl font-bold text-primary opacity-60">฿</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                className="flex-1 text-xl font-bold text-on-surface bg-transparent outline-none placeholder:text-on-surface-variant/30"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none border border-outline-variant focus:border-primary"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">หมวดหมู่</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-surface-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none border border-outline-variant focus:border-primary appearance-none"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">รายละเอียด</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม..."
              rows={2}
              className="w-full bg-surface-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none border border-outline-variant focus:border-primary placeholder:text-on-surface-variant/50 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error-container rounded-xl">
              <span className="material-symbols-outlined text-error text-[16px]">error</span>
              <p className="font-body-md text-on-error-container">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-outline-variant font-body-md text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-body-md font-semibold hover:opacity-90 transition-opacity"
            >
              ยืนยันบันทึกรายจ่าย
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
