"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type SeedRow = {
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note: string;
};

const DEMO_DATA: SeedRow[] = [
  // ── 2026-06 รายรับ ──────────────────────────────────────────
  { date: "2026-06-01", type: "income", category: "ยอดขายอาหาร",       amount: 150000, note: "เงินสด (Cash) — บริการวันหยุดสุดสัปดาห์" },
  { date: "2026-06-05", type: "income", category: "ยอดขายอาหาร",       amount: 100000, note: "โอนเงิน (Transfer) — บริการโต๊ะสัปดาห์แรก" },
  { date: "2026-06-10", type: "income", category: "ยอดขายอาหาร",       amount: 150000, note: "โอนเงิน (Transfer) — บริการโต๊ะสัปดาห์ที่ 2" },
  { date: "2026-06-15", type: "income", category: "ยอดขายอาหาร",       amount: 90000,  note: "บัตรเครดิต (Card) — ลูกค้า Corporate" },
  { date: "2026-06-20", type: "income", category: "ยอดขายอาหาร",       amount: 50000,  note: "โอนเงิน (Transfer) — บริการโต๊ะสัปดาห์ที่ 3" },
  { date: "2026-06-05", type: "income", category: "ยอดขายเครื่องดื่ม", amount: 80000,  note: "บัตรเครดิต (Card) — บาร์ประจำสัปดาห์" },
  { date: "2026-06-18", type: "income", category: "ยอดขายเครื่องดื่ม", amount: 100000, note: "บัตรเครดิต (Card) — Cocktail Evening" },
  { date: "2026-06-08", type: "income", category: "เดลิเวอรี",          amount: 60000,  note: "โอนเงิน (Transfer) — Grab/Lineman" },
  { date: "2026-06-22", type: "income", category: "เดลิเวอรี",          amount: 40000,  note: "โอนเงิน (Transfer) — Shopee Food" },

  // ── 2026-06 รายจ่าย ─────────────────────────────────────────
  { date: "2026-06-02", type: "expense", category: "วัตถุดิบ",     amount: 95000,  note: "เนื้อวากิว A5 – ล็อตนำเข้า" },
  { date: "2026-06-09", type: "expense", category: "วัตถุดิบ",     amount: 80000,  note: "วัตถุดิบประจำสัปดาห์ที่ 2" },
  { date: "2026-06-16", type: "expense", category: "วัตถุดิบ",     amount: 65000,  note: "วัตถุดิบประจำสัปดาห์ที่ 3" },
  { date: "2026-06-23", type: "expense", category: "วัตถุดิบ",     amount: 45000,  note: "วัตถุดิบประจำสัปดาห์ที่ 4" },
  { date: "2026-06-21", type: "expense", category: "ค่าแรง",       amount: 145000, note: "เงินเดือนเชฟและพนักงานเสิร์ฟ" },
  { date: "2026-06-01", type: "expense", category: "ค่าเช่า",      amount: 55000,  note: "ค่าเช่าร้านประจำเดือนมิถุนายน" },
  { date: "2026-06-20", type: "expense", category: "ค่าน้ำค่าไฟ", amount: 32000,  note: "ค่าไฟฟ้าสาขา 1" },
  { date: "2026-06-12", type: "expense", category: "การตลาด",      amount: 50000,  note: "ยิงโฆษณา Facebook/IG" },
  { date: "2026-06-15", type: "expense", category: "บรรจุภัณฑ์",  amount: 43000,  note: "บรรจุภัณฑ์สำหรับ Delivery" },

  // ── 2026-05 ──────────────────────────────────────────────────
  { date: "2026-05-03", type: "income",  category: "ยอดขายอาหาร",       amount: 140000, note: "เงินสด (Cash) — บริการสัปดาห์แรก" },
  { date: "2026-05-10", type: "income",  category: "ยอดขายอาหาร",       amount: 200000, note: "โอนเงิน (Transfer) — บริการโต๊ะ" },
  { date: "2026-05-17", type: "income",  category: "ยอดขายอาหาร",       amount: 110000, note: "โอนเงิน (Transfer) — บริการโต๊ะ" },
  { date: "2026-05-08", type: "income",  category: "ยอดขายเครื่องดื่ม", amount: 80000,  note: "บัตรเครดิต (Card) — บาร์" },
  { date: "2026-05-20", type: "income",  category: "ยอดขายเครื่องดื่ม", amount: 100000, note: "บัตรเครดิต (Card) — Happy Hour" },
  { date: "2026-05-12", type: "income",  category: "เดลิเวอรี",          amount: 55000,  note: "โอนเงิน (Transfer) — Grab/Lineman" },
  { date: "2026-05-24", type: "income",  category: "เดลิเวอรี",          amount: 44000,  note: "โอนเงิน (Transfer) — Shopee Food" },
  { date: "2026-05-02", type: "expense", category: "วัตถุดิบ",     amount: 90000,  note: "วัตถุดิบสัปดาห์แรก" },
  { date: "2026-05-09", type: "expense", category: "วัตถุดิบ",     amount: 75000,  note: "วัตถุดิบสัปดาห์ที่ 2" },
  { date: "2026-05-16", type: "expense", category: "วัตถุดิบ",     amount: 60000,  note: "วัตถุดิบสัปดาห์ที่ 3" },
  { date: "2026-05-21", type: "expense", category: "ค่าแรง",       amount: 140000, note: "เงินเดือนประจำเดือนพฤษภาคม" },
  { date: "2026-05-01", type: "expense", category: "ค่าเช่า",      amount: 55000,  note: "ค่าเช่าร้านประจำเดือนพฤษภาคม" },
  { date: "2026-05-20", type: "expense", category: "ค่าน้ำค่าไฟ", amount: 34000,  note: "ค่าสาธารณูปโภค" },
  { date: "2026-05-14", type: "expense", category: "การตลาด",      amount: 45000,  note: "โปรโมทเมนูใหม่" },
  { date: "2026-05-18", type: "expense", category: "บรรจุภัณฑ์",  amount: 86000,  note: "บรรจุภัณฑ์ Delivery และวัตถุดิบเพิ่ม" },

  // ── 2026-04 ──────────────────────────────────────────────────
  { date: "2026-04-05", type: "income",  category: "ยอดขายอาหาร",       amount: 380000, note: "รายรับอาหารประจำเดือน" },
  { date: "2026-04-10", type: "income",  category: "ยอดขายเครื่องดื่ม", amount: 175000, note: "บัตรเครดิต (Card) — บาร์" },
  { date: "2026-04-15", type: "income",  category: "เดลิเวอรี",          amount: 140000, note: "โอนเงิน (Transfer) — Delivery" },
  { date: "2026-04-03", type: "expense", category: "วัตถุดิบ",     amount: 240000, note: "วัตถุดิบประจำเดือน" },
  { date: "2026-04-21", type: "expense", category: "ค่าแรง",       amount: 138000, note: "เงินเดือนประจำเดือนเมษายน" },
  { date: "2026-04-01", type: "expense", category: "ค่าเช่า",      amount: 55000,  note: "ค่าเช่าร้านประจำเดือนเมษายน" },
  { date: "2026-04-20", type: "expense", category: "ค่าน้ำค่าไฟ", amount: 32000,  note: "ค่าสาธารณูปโภค" },
  { date: "2026-04-15", type: "expense", category: "การตลาด",      amount: 40000,  note: "สื่อโฆษณาออนไลน์" },
  { date: "2026-04-18", type: "expense", category: "บรรจุภัณฑ์",  amount: 40000,  note: "บรรจุภัณฑ์" },

  // ── 2026-03 ──────────────────────────────────────────────────
  { date: "2026-03-05", type: "income",  category: "ยอดขายอาหาร",       amount: 360000, note: "รายรับอาหารประจำเดือน" },
  { date: "2026-03-10", type: "income",  category: "ยอดขายเครื่องดื่ม", amount: 165000, note: "รายรับเครื่องดื่ม" },
  { date: "2026-03-15", type: "income",  category: "เดลิเวอรี",          amount: 130000, note: "รายรับ Delivery" },
  { date: "2026-03-03", type: "expense", category: "วัตถุดิบ",     amount: 220000, note: "วัตถุดิบประจำเดือน" },
  { date: "2026-03-21", type: "expense", category: "ค่าแรง",       amount: 135000, note: "เงินเดือนประจำเดือนมีนาคม" },
  { date: "2026-03-01", type: "expense", category: "ค่าเช่า",      amount: 55000,  note: "ค่าเช่าร้านประจำเดือนมีนาคม" },
  { date: "2026-03-20", type: "expense", category: "ค่าน้ำค่าไฟ", amount: 30000,  note: "ค่าสาธารณูปโภค" },
  { date: "2026-03-15", type: "expense", category: "การตลาด",      amount: 35000,  note: "โปรโมท" },
  { date: "2026-03-18", type: "expense", category: "บรรจุภัณฑ์",  amount: 35000,  note: "บรรจุภัณฑ์" },

  // ── 2026-02 ──────────────────────────────────────────────────
  { date: "2026-02-05", type: "income",  category: "ยอดขายอาหาร",       amount: 340000, note: "รายรับอาหารประจำเดือน" },
  { date: "2026-02-10", type: "income",  category: "ยอดขายเครื่องดื่ม", amount: 155000, note: "รายรับเครื่องดื่ม" },
  { date: "2026-02-15", type: "income",  category: "เดลิเวอรี",          amount: 125000, note: "รายรับ Delivery" },
  { date: "2026-02-03", type: "expense", category: "วัตถุดิบ",     amount: 205000, note: "วัตถุดิบประจำเดือน" },
  { date: "2026-02-21", type: "expense", category: "ค่าแรง",       amount: 130000, note: "เงินเดือนประจำเดือนกุมภาพันธ์" },
  { date: "2026-02-01", type: "expense", category: "ค่าเช่า",      amount: 55000,  note: "ค่าเช่าร้านประจำเดือนกุมภาพันธ์" },
  { date: "2026-02-20", type: "expense", category: "ค่าน้ำค่าไฟ", amount: 28000,  note: "ค่าสาธารณูปโภค" },
  { date: "2026-02-15", type: "expense", category: "การตลาด",      amount: 32000,  note: "โปรโมท" },
  { date: "2026-02-18", type: "expense", category: "บรรจุภัณฑ์",  amount: 30000,  note: "บรรจุภัณฑ์" },

  // ── 2026-01 ──────────────────────────────────────────────────
  { date: "2026-01-05", type: "income",  category: "ยอดขายอาหาร",       amount: 320000, note: "รายรับอาหารประจำเดือน" },
  { date: "2026-01-10", type: "income",  category: "ยอดขายเครื่องดื่ม", amount: 145000, note: "รายรับเครื่องดื่ม" },
  { date: "2026-01-15", type: "income",  category: "เดลิเวอรี",          amount: 115000, note: "รายรับ Delivery" },
  { date: "2026-01-03", type: "expense", category: "วัตถุดิบ",     amount: 195000, note: "วัตถุดิบประจำเดือน" },
  { date: "2026-01-21", type: "expense", category: "ค่าแรง",       amount: 125000, note: "เงินเดือนประจำเดือนมกราคม" },
  { date: "2026-01-01", type: "expense", category: "ค่าเช่า",      amount: 55000,  note: "ค่าเช่าร้านประจำเดือนมกราคม" },
  { date: "2026-01-20", type: "expense", category: "ค่าน้ำค่าไฟ", amount: 25000,  note: "ค่าสาธารณูปโภค" },
  { date: "2026-01-15", type: "expense", category: "การตลาด",      amount: 30000,  note: "โปรโมท" },
  { date: "2026-01-18", type: "expense", category: "บรรจุภัณฑ์",  amount: 25000,  note: "บรรจุภัณฑ์" },
];

type Status = "idle" | "loading" | "success" | "error";

export function SeedPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [cleared, setCleared] = useState(false);

  async function handleSeed(clearFirst: boolean) {
    setStatus("loading");
    setLog([]);
    const supabase = getSupabaseClient();

    try {
      if (clearFirst) {
        setLog((p) => [...p, "🗑️  ลบข้อมูลเดิมทั้งหมด..."]);
        const { error } = await supabase.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw new Error("Delete failed: " + error.message);
        setCleared(true);
        setLog((p) => [...p, "✅ ลบข้อมูลเดิมสำเร็จ"]);
      }

      setLog((p) => [...p, `📝 กำลัง insert ${DEMO_DATA.length} รายการ...`]);
      const { error } = await supabase.from("transactions").insert(DEMO_DATA);
      if (error) throw new Error("Insert failed: " + error.message);

      const incomeTotal = DEMO_DATA.filter((r) => r.type === "income" && r.date.startsWith("2026-06")).reduce((s, r) => s + r.amount, 0);
      const expenseTotal = DEMO_DATA.filter((r) => r.type === "expense" && r.date.startsWith("2026-06")).reduce((s, r) => s + r.amount, 0);

      setLog((p) => [
        ...p,
        `✅ Insert สำเร็จ ${DEMO_DATA.length} รายการ`,
        `📊 2026-06: รายรับ ฿${incomeTotal.toLocaleString("th-TH")} / รายจ่าย ฿${expenseTotal.toLocaleString("th-TH")}`,
        `💰 กำไร ฿${(incomeTotal - expenseTotal).toLocaleString("th-TH")} (Margin ${((incomeTotal - expenseTotal) / incomeTotal * 100).toFixed(1)}%)`,
      ]);
      setStatus("success");
    } catch (err) {
      setLog((p) => [...p, `❌ Error: ${err instanceof Error ? err.message : String(err)}`]);
      setStatus("error");
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">
      <div>
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-surface mb-1">
          Demo Data Seeder
        </h2>
        <p className="font-body-md text-on-surface-variant">
          ใส่ข้อมูลตัวอย่าง 6 เดือน (ม.ค.–มิ.ย. 2569) เพื่อทดสอบ UI
        </p>
      </div>

      {/* Summary */}
      <div className="metric-card p-5 rounded-2xl space-y-2">
        <p className="font-label-caps text-label-caps text-on-surface-variant">ข้อมูลที่จะ insert</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { month: "2026-06", income: 820000, expense: 610000 },
            { month: "2026-05", income: 729000, expense: 585000 },
            { month: "2026-04", income: 695000, expense: 545000 },
            { month: "2026-03", income: 655000, expense: 510000 },
            { month: "2026-02", income: 620000, expense: 480000 },
            { month: "2026-01", income: 580000, expense: 455000 },
          ].map(({ month, income, expense }) => (
            <div key={month} className="bg-surface-container-low rounded-xl p-3">
              <p className="font-label-caps text-label-caps text-on-surface-variant">{month}</p>
              <p className="font-body-md text-primary text-sm">+฿{(income / 1000).toFixed(0)}k</p>
              <p className="font-body-md text-error text-sm">-฿{(expense / 1000).toFixed(0)}k</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => handleSeed(true)}
          disabled={status === "loading"}
          className="btn-primary w-full py-4 disabled:opacity-60"
        >
          {status === "loading" && !cleared ? "กำลังดำเนินการ..." : "🗑️  ล้างข้อมูลเดิม แล้ว Insert ใหม่"}
        </button>
        <button
          onClick={() => handleSeed(false)}
          disabled={status === "loading"}
          className="btn-secondary w-full py-4 disabled:opacity-60"
        >
          ➕ เพิ่มข้อมูลโดยไม่ล้างของเดิม
        </button>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="metric-card p-5 rounded-2xl space-y-1">
          {log.map((line, i) => (
            <p key={i} className="font-label-caps text-label-caps text-on-surface">{line}</p>
          ))}
        </div>
      )}

      {status === "success" && (
        <div className="sand-card p-4 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">check_circle</span>
          <div>
            <p className="font-body-md text-on-surface font-semibold">เสร็จสิ้น!</p>
            <p className="font-label-caps text-label-caps text-on-surface-variant">
              กลับไปที่ <a href="/dashboard" className="text-primary underline">Dashboard</a> เพื่อดูข้อมูล
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="p-4 rounded-2xl bg-error-container flex items-start gap-3">
          <span className="material-symbols-outlined text-error text-[20px]">error</span>
          <p className="font-body-md text-on-error-container">เกิดข้อผิดพลาด ดูรายละเอียดใน log ด้านบน</p>
        </div>
      )}

      <p className="font-label-caps text-label-caps text-on-surface-variant text-center">
        หน้านี้มีไว้สำหรับ demo เท่านั้น — ไม่ได้แสดงใน navigation
      </p>
    </div>
  );
}
