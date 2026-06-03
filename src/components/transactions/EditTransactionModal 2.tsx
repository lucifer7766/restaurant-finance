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

export default function EditTransactionModal({ transaction, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    date: "",
    type: "expense" as "income" | "expense",
    category: "",
    amount: "",
    note: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (transaction) {
      setForm({
        date: transaction.date,
        type: transaction.type,
        category: transaction.category ?? "",
        amount: String(transaction.amount),
        note: transaction.note ?? "",
      });
    }
  }, [transaction]);

  if (!transaction) return null;

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
      await updateTransaction(transaction.id, {
        date: form.date,
        type: form.type,
        category: form.category,
        amount: parsedAmount,
        note: form.note,
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

          {/* Type toggle */}
          <div className="flex rounded-xl bg-surface-container p-1 gap-1">
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
              className="w-full bg-secondary-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant"
            />
          </div>

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
              value={form.note}
              onChange={handleChange}
              rows={2}
              placeholder="รายละเอียดเพิ่มเติม..."
              className="w-full bg-secondary-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant resize-none"
            />
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
