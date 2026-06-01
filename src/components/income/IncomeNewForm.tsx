"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransactions } from "@/components/transactions/TransactionsContent";

const INCOME_CATEGORIES = [
  { key: "ยอดขายอาหาร", icon: "restaurant" },
  { key: "เครื่องดื่ม", icon: "local_bar" },
  { key: "เดลิเวอรี", icon: "delivery_dining" },
  { key: "จัดเลี้ยง", icon: "event" },
  { key: "อื่นๆ", icon: "more_horiz" },
];

const PAYMENT_CHANNELS = [
  { value: "เงินสด (Cash)", label: "เงินสด (Cash)" },
  { value: "โอนเงิน (Transfer)", label: "โอนเงิน (Transfer)" },
  { value: "บัตรเครดิต (Card)", label: "บัตรเครดิต (Card)" },
  { value: "Prompt Pay", label: "Prompt Pay" },
];

export function IncomeNewForm() {
  const router = useRouter();
  const { addTransaction, transactions } = useTransactions();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("ยอดขายอาหาร");
  const [paymentChannel, setPaymentChannel] = useState("เงินสด (Cash)");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* Today's income summary */
  const today = new Date().toISOString().slice(0, 10);
  const todayIncomeTxns = transactions.filter((t) => t.type === "income" && t.date === today);
  const todayIncomeTotal = todayIncomeTxns.reduce((s, t) => s + t.amount, 0);
  const todayCount = todayIncomeTxns.length;

  async function handleSave() {
    const amt = Number(amount);
    if (!category) { setError("เลือกหมวดหมู่ก่อน"); return; }
    if (!amt || amt <= 0) { setError("กรอกจำนวนเงินให้ถูกต้อง"); return; }
    if (!date) { setError("เลือกวันที่ก่อน"); return; }

    setError(null);
    setSaving(true);
    try {
      await addTransaction({
        date,
        type: "income",
        category,
        amount: amt,
        note: paymentChannel + (note ? ` — ${note}` : ""),
      } as Parameters<typeof addTransaction>[0]);
      router.push("/income");
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-10">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-surface">เพิ่มรายรับ</h2>
      </div>

      {/* ── Main card ──────────────────────────────────────── */}
      <div className="metric-card rounded-2xl overflow-hidden">

        {/* Amount input */}
        <div className="p-7 bg-surface-container-low text-center">
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">จำนวนเงิน (บาท)</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl font-bold text-primary opacity-50">฿</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-48 text-5xl font-bold font-headline-md text-on-surface bg-transparent outline-none text-center placeholder:text-on-surface-variant/30"
            />
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Category chips */}
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-3">หมวดหมู่</p>
            <div className="flex flex-wrap gap-2">
              {INCOME_CATEGORIES.map(({ key, icon }) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-body-md transition-all border ${
                    category === key
                      ? "bg-primary text-on-primary border-primary"
                      : "bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{icon}</span>
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* Payment channel */}
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              ช่องทางชำระเงิน
            </label>
            <div className="relative">
              <select
                value={paymentChannel}
                onChange={(e) => setPaymentChannel(e.target.value)}
                className="w-full bg-surface-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none border border-outline-variant focus:border-primary appearance-none"
              >
                {PAYMENT_CHANNELS.map(({ value, label }) => (
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
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">วันที่</label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-surface-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none border border-outline-variant focus:border-primary"
              />
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                calendar_month
              </span>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              หมายเหตุ (ถ้ามี)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ระบุรายละเอียดเพิ่มเติม..."
              rows={3}
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
            {saving ? "กำลังบันทึก..." : "บันทึกรายการ"}
          </button>
        </div>
      </div>

      {/* ── Today summary ──────────────────────────────────── */}
      <div className="sand-card p-4 rounded-2xl flex items-start gap-3">
        <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5">info</span>
        <div>
          <p className="font-body-md text-on-surface">ยอดสรุปรวมวันนี้</p>
          <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">
            ปัจจุบันคุณมีรายรับบันทึกแล้ว {todayCount} รายการ รวมทั้งสิ้น{" "}
            <span className="text-primary font-semibold">
              ฿{todayIncomeTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
      </div>

    </div>
  );
}
