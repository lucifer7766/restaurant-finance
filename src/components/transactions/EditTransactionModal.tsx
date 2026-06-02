"use client";

import { useState, useEffect } from "react";
import { updateTransaction } from "@/lib/supabase/transactions";

type Transaction = {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note: string;
  created_at?: string;
};

type Props = {
  transaction: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
};

function isPosTransaction(note: string) {
  return note?.startsWith("POS_IMPORT_") || note?.startsWith("POS Import:");
}

const PAYMENT_CHANNELS = ["เงินสด", "โอนเงิน", "บัตรเครดิต", "พร้อมเพย์"];

/** แยก paymentChannel และ actualNote จาก note ของ income
 *  format ที่บันทึก: "เงินสด — หมายเหตุ..." หรือ "เงินสด" (ไม่มีหมายเหตุ) */
function parseIncomeNote(note: string): { paymentChannel: string; actualNote: string } {
  const sepIdx = note.indexOf(" — ");
  if (sepIdx !== -1) {
    const maybeCh = note.slice(0, sepIdx);
    if (PAYMENT_CHANNELS.includes(maybeCh)) {
      return { paymentChannel: maybeCh, actualNote: note.slice(sepIdx + 3) };
    }
  }
  if (PAYMENT_CHANNELS.includes(note.trim())) {
    return { paymentChannel: note.trim(), actualNote: "" };
  }
  return { paymentChannel: "เงินสด", actualNote: note };
}

export default function EditTransactionModal({ transaction, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    date: "",
    type: "expense" as "income" | "expense",
    category: "",
    amount: "",
    note: "",
  });
  const [paymentChannel, setPaymentChannel] = useState("เงินสด");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (transaction) {
      // BUG-004: สำหรับ income ให้แยก paymentChannel ออกจาก note
      const { paymentChannel: ch, actualNote } =
        transaction.type === "income" && !isPosTransaction(transaction.note ?? "")
          ? parseIncomeNote(transaction.note ?? "")
          : { paymentChannel: "เงินสด", actualNote: transaction.note ?? "" };
      setPaymentChannel(ch);
      setForm({
        date: transaction.date,
        type: transaction.type,
        category: transaction.category ?? "",
        amount: String(transaction.amount),
        note: actualNote,
      });
    }
  }, [transaction]);

  if (!transaction) return null;

  const isPos = isPosTransaction(transaction.note ?? "");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    const parsedAmount = parseFloat(form.amount);

    if (!form.date || !form.type || !form.category || isNaN(parsedAmount)) {
      setError("กรอกข้อมูลให้ครบทุกช่อง");
      setLoading(false);
      return;
    }

    try {
      // BUG-004: สร้าง note สำหรับ income โดยรวม paymentChannel กลับเข้าไป
      const savedNote =
        form.type === "income" && !isPos
          ? paymentChannel + (form.note ? ` — ${form.note}` : "")
          : form.note;

      await updateTransaction(transaction.id, {
        date: form.date,
        type: form.type,
        category: form.category,
        amount: parsedAmount,
        note: savedNote,
      });

      onSaved();
      onClose();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "ไม่สามารถบันทึกได้ กรุณาลองใหม่"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-surface-variant flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container text-[20px]">
                edit
              </span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              แก้ไขรายการ
            </h3>
          </div>
          <button
            onClick={onClose}
            className="material-symbols-outlined p-2 hover:bg-surface-variant rounded-full text-on-surface-variant"
          >
            close
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error-container rounded-xl">
              <span className="material-symbols-outlined text-error text-[18px]">error</span>
              <p className="font-body-md text-on-error-container">{error}</p>
            </div>
          )}

          {isPos && (
            <div className="flex items-center gap-2 p-3 bg-surface-container rounded-xl">
              <span className="material-symbols-outlined text-primary text-[18px]">point_of_sale</span>
              <p className="font-body-sm text-on-surface-variant">รายการ POS — แก้ได้เฉพาะวันที่และยอดเงิน</p>
            </div>
          )}

          {/* Type toggle */}
          <div className={`flex rounded-xl bg-surface-container p-1 gap-1 ${isPos ? "opacity-50 pointer-events-none" : ""}`}>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: "income" }))}
              className={`flex-1 py-2 rounded-lg font-body-md transition-all ${
                form.type === "income"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              รายรับ
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: "expense" }))}
              className={`flex-1 py-2 rounded-lg font-body-md transition-all ${
                form.type === "expense"
                  ? "bg-primary-container text-on-primary-container shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              รายจ่าย
            </button>
          </div>

          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              วันที่ <span className="text-error">*</span>
            </label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="w-full bg-secondary-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              หมวดหมู่ <span className="text-error">*</span>
            </label>
            <input
              type="text"
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="เช่น วัตถุดิบ, ค่าแรง, รายได้จากขาย"
              readOnly={isPos}
              className={`w-full bg-secondary-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none placeholder:text-on-surface-variant ${isPos ? "opacity-50 cursor-not-allowed" : "focus:ring-2 focus:ring-primary"}`}
            />
          </div>

          {/* BUG-004: ช่องทางชำระเงิน — แสดงเฉพาะ income ที่ไม่ใช่ POS */}
          {form.type === "income" && !isPos && (
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                ช่องทางชำระเงิน
              </label>
              <div className="relative">
                <select
                  value={paymentChannel}
                  onChange={(e) => setPaymentChannel(e.target.value)}
                  className="w-full bg-secondary-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary appearance-none"
                >
                  {PAYMENT_CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                  expand_more
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              จำนวนเงิน (฿) <span className="text-error">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body-md text-on-surface-variant">
                ฿
              </span>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full bg-secondary-container rounded-xl px-4 py-3 pl-8 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant"
              />
            </div>
          </div>

          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              หมายเหตุ
            </label>
            <textarea
              name="note"
              value={isPos ? "" : form.note}
              onChange={handleChange}
              rows={2}
              placeholder={isPos ? "—" : "รายละเอียดเพิ่มเติม..."}
              readOnly={isPos}
              className={`w-full bg-secondary-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none placeholder:text-on-surface-variant resize-none ${isPos ? "opacity-50 cursor-not-allowed" : "focus:ring-2 focus:ring-primary"}`}
            />
            {/* BUG-004: hint ว่า paymentChannel จะถูกบันทึกร่วมกับ note */}
            {form.type === "income" && !isPos && (
              <p className="mt-1 font-label-caps text-label-caps text-on-surface-variant">
                จะบันทึกเป็น &ldquo;{paymentChannel}{form.note ? ` — ${form.note}` : ""}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-surface-variant flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-body-md text-on-surface-variant hover:bg-surface-variant transition-colors disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-body-md hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
