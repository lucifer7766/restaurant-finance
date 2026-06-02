"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransactions } from "@/components/transactions/TransactionsContent";

// BUG-006: ใช้ชื่อภาษาไทยล้วน ตรงกับข้อมูลเดิมใน DB
const EXPENSE_CATEGORIES = [
  { value: "วัตถุดิบ", label: "วัตถุดิบ" },
  { value: "ค่าแรง", label: "ค่าแรง" },
  { value: "ค่าเช่า", label: "ค่าเช่า" },
  { value: "ค่าน้ำค่าไฟ", label: "ค่าน้ำค่าไฟ" },
  { value: "การตลาด", label: "การตลาด" },
  { value: "บรรจุภัณฑ์", label: "บรรจุภัณฑ์" },
  { value: "ซ่อมบำรุง", label: "ซ่อมบำรุง" },
  { value: "อื่นๆ", label: "อื่นๆ" },
];

export function ExpenseNewForm() {
  const router = useRouter();
  const { addTransaction } = useTransactions();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("วัตถุดิบ");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [payStatus, setPayStatus] = useState<"paid" | "pending">("paid");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  async function handleSave() {
    const amt = Number(amount);
    if (!category) { setError("เลือกประเภทรายจ่ายก่อน"); return; }
    if (!amt || amt <= 0) { setError("กรอกจำนวนเงินให้ถูกต้อง"); return; }

    const saveDate = date || new Date().toISOString().slice(0, 10);
    setError(null);
    setSaving(true);
    try {
      await addTransaction({
        date: saveDate,
        type: "expense",
        category,
        amount: amt,
        note: (payStatus === "pending" ? "[ค้างชำระ] " : "") + note,
      } as Parameters<typeof addTransaction>[0]);
      // BUG-007: setSuccess หลัง await สำเร็จ แล้ว redirect ทันที
      setSuccess(true);
      setTimeout(() => router.push("/expense"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-10">

      {/* ── Success toast ───────────────────────────────────── */}
      {success && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-on-primary shadow-lg animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span className="font-body-md font-semibold">บันทึกรายจ่ายสำเร็จ</span>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-surface">เพิ่มรายจ่าย</h2>
      </div>

      {/* ── Main card ──────────────────────────────────────── */}
      <div className="metric-card rounded-2xl overflow-hidden">

        {/* Header label */}
        <div className="px-6 pt-6 pb-2">
          <p className="font-label-caps text-label-caps text-on-surface-variant">ข้อมูลการทำรายการ</p>
          <h3 className="font-headline-md text-headline-md text-on-surface">บันทึกรายจ่ายใหม่</h3>
        </div>

        <div className="p-6 space-y-6">

          {/* Amount */}
          <div>
            <p className="font-headline-md text-headline-md text-on-surface mb-3">จำนวนเงิน</p>
            <div className="flex items-center gap-3 border-b-2 border-outline-variant pb-3 focus-within:border-primary transition-colors">
              <span className="text-4xl font-bold text-primary">฿</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                className="flex-1 text-4xl font-bold font-headline-md text-on-surface bg-transparent outline-none placeholder:text-on-surface-variant/30"
              />
            </div>
          </div>

          {/* Category dropdown */}
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              ประเภทรายจ่าย
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-surface-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none border border-outline-variant focus:border-primary appearance-none"
              >
                {EXPENSE_CATEGORIES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              วันที่ทำรายการ
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="mm/dd/yyyy"
                className="w-full bg-surface-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none border border-outline-variant focus:border-primary"
              />
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                calendar_month
              </span>
            </div>
          </div>

          {/* Payment status */}
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-3">
              สถานะการชำระเงิน
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setPayStatus("paid")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-body-md transition-all ${
                  payStatus === "paid"
                    ? "border-primary bg-primary-container text-on-primary-container"
                    : "border-outline-variant text-on-surface-variant hover:border-primary/50"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                จ่ายแล้ว
              </button>
              <button
                onClick={() => setPayStatus("pending")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-body-md transition-all ${
                  payStatus === "pending"
                    ? "border-tertiary bg-tertiary-container text-on-tertiary-fixed-variant"
                    : "border-outline-variant text-on-surface-variant hover:border-tertiary/50"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                ค้างชำระ
              </button>
            </div>
          </div>

          {/* Receipt upload */}
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              แนบหลักฐานการจ่ายเงิน (Optional)
            </label>
            <label className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
              attachedFile
                ? "border-primary bg-primary-container/20 text-primary"
                : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
            }`}>
              <input
                type="file"
                accept="image/*,.pdf,.csv,.xlsx"
                className="hidden"
                onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
              />
              <span className="material-symbols-outlined text-[32px]">
                {attachedFile ? "attach_file" : "add_a_photo"}
              </span>
              <p className="font-body-md text-center">
                {attachedFile ? attachedFile.name : "อัปโหลดใบเสร็จหรือรายงาน POS"}
              </p>
              {attachedFile && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setAttachedFile(null); }}
                  className="font-label-caps text-label-caps text-on-surface-variant hover:text-error transition-colors"
                >
                  ลบไฟล์
                </button>
              )}
            </label>
            <p className="font-label-caps text-label-caps text-on-surface-variant mt-1.5">
              รองรับรูปภาพใบเสร็จ, PDF, CSV, Excel
            </p>
          </div>

          {/* Note */}
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              หมายเหตุ
            </label>
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
              <span className="material-symbols-outlined text-error text-[18px]">error</span>
              <p className="font-body-md text-on-error-container">{error}</p>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full py-4 text-base disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">save</span>
            {saving ? "กำลังบันทึก..." : "บันทึกรายจ่าย"}
          </button>

          <button
            onClick={() => router.back()}
            className="w-full text-center py-2 font-body-md text-on-surface-variant hover:text-on-surface transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>

      {/* ── Tip ────────────────────────────────────────────── */}
      <div className="sand-card p-4 rounded-2xl flex items-start gap-3">
        <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5">info</span>
        <div>
          <p className="font-body-md text-on-surface font-semibold">คำแนะนำ</p>
          <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">
            การระบุประเภทรายจ่ายให้ชัดเจน จะช่วยให้คุณสามารถวิเคราะห์กำไร–ขาดทุน ผ่านหน้ารายงานได้แม่นยำยิ่งขึ้น
          </p>
        </div>
      </div>

    </div>
  );
}
