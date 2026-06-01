"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import { useMonthFilter } from "@/context/MonthFilterContext";
import { filterTransactionsByMonth } from "@/lib/data";
import { formatMonthLabel, formatTransactionDate, getCategoryLabel } from "@/lib/utils";

const EXPENSE_CATEGORY_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  วัตถุดิบ: { icon: "grocery", color: "text-on-primary-container", bg: "bg-primary-container" },
  ค่าแรง: { icon: "groups", color: "text-on-tertiary-fixed-variant", bg: "bg-tertiary-container" },
  ค่าเช่า: { icon: "home", color: "text-on-secondary-container", bg: "bg-secondary-container" },
  ไฟฟ้า: { icon: "electric_bolt", color: "text-error", bg: "bg-error-container" },
  การตลาด: { icon: "campaign", color: "text-on-primary-container", bg: "bg-primary-fixed" },
};

function getCategoryStyle(category: string) {
  const key = Object.keys(EXPENSE_CATEGORY_ICONS).find((k) => category.includes(k));
  return key
    ? EXPENSE_CATEGORY_ICONS[key]
    : { icon: "receipt_long", color: "text-on-surface-variant", bg: "bg-surface-container-high" };
}

export function ExpenseContent() {
  const { transactions, isLoading, error } = useTransactions();
  const { selectedMonth } = useMonthFilter();

  const monthLabel = formatMonthLabel(selectedMonth);

  const allExpenses = useMemo(
    () => transactions.filter((t) => t.type === "expense"),
    [transactions]
  );

  const monthExpenses = useMemo(
    () => filterTransactionsByMonth(allExpenses, selectedMonth),
    [allExpenses, selectedMonth]
  );

  const totalExpense = useMemo(
    () => monthExpenses.reduce((s, t) => s + t.amount, 0),
    [monthExpenses]
  );

  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    monthExpenses.forEach((t) => {
      const cat = t.category || "อื่นๆ";
      totals[cat] = (totals[cat] ?? 0) + t.amount;
    });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount }));
  }, [monthExpenses]);

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-1">
          Management Dashboard
        </p>
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">
          รายงานรายจ่ายประจำเดือน
        </h2>
        <p className="font-body-md text-on-surface-variant">
          ตรวจสอบและจัดการต้นทุนของ PLU Bistro อย่างเป็นระบบ
        </p>
      </div>

      {/* ── Action buttons ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/expense/new" className="btn-primary flex-1 text-center">
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          เพิ่มรายจ่าย
        </Link>
        <button className="btn-secondary flex-1" disabled>
          <span className="material-symbols-outlined text-[18px]">photo_camera</span>
          ถ่ายรูปใบเสร็จ
        </button>
      </div>

      {error && (
        <div className="sand-card p-4 rounded-xl flex items-center gap-3 border-l-4 border-error">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-on-surface">{error}</p>
        </div>
      )}

      {/* ── Category Cards ──────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="metric-card rounded-2xl p-7 animate-pulse">
              <div className="h-3 bg-surface-container-highest rounded w-1/3 mb-5" />
              <div className="h-12 bg-surface-container-highest rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : categoryBreakdown.length === 0 ? (
        <div className="metric-card p-10 rounded-2xl text-center">
          <p className="font-body-md text-on-surface-variant">ยังไม่มีรายจ่ายใน{monthLabel}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categoryBreakdown.map(({ category, amount }) => {
            const style = getCategoryStyle(category);
            const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
            const isTop = categoryBreakdown[0]?.category === category;
            return (
              <div key={category} className="metric-card p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.bg}`}>
                      <span className={`material-symbols-outlined text-[20px] ${style.color}`}>{style.icon}</span>
                    </div>
                    <span className="font-body-md text-on-surface">{getCategoryLabel(category)}</span>
                  </div>
                  {isTop && (
                    <span className="font-label-caps text-label-caps text-primary bg-primary-container px-2 py-0.5 rounded-full">
                      +12% vs last month
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 text-on-surface mt-3">
                  <span className="text-sm font-bold opacity-60">฿</span>
                  <span className="text-3xl font-bold font-headline-md tracking-tight">
                    {amount.toLocaleString("th-TH")}
                  </span>
                </div>
                <div className="mt-3 h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-error rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── รายการรายจ่ายล่าสุด ─────────────────────────────── */}
      <div className="metric-card rounded-2xl overflow-hidden">
        <div className="p-6 pb-4 flex items-center justify-between border-b border-surface-container-low">
          <h3 className="font-headline-md text-headline-md text-on-surface">รายการรายจ่ายล่าสุด</h3>
        </div>

        {/* Filter tabs */}
        <div className="px-4 py-3 flex gap-2 overflow-x-auto border-b border-surface-container-low">
          {["ทั้งหมด", ...categoryBreakdown.slice(0, 3).map((c) => c.category)].map((tab, i) => (
            <button key={tab} className={`px-3 py-1.5 rounded-full font-label-caps text-label-caps shrink-0 transition-colors ${
              i === 0
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}>
              {getCategoryLabel(tab)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="px-6 py-10 text-center font-body-md text-on-surface-variant">กำลังโหลด...</p>
        ) : monthExpenses.length === 0 ? (
          <p className="px-6 py-10 text-center font-body-md text-on-surface-variant">ไม่มีรายจ่ายใน{monthLabel}</p>
        ) : (
          <>
            <div className="px-4 py-2 grid grid-cols-3 border-b border-surface-container-low">
              <span className="font-label-caps text-label-caps text-on-surface-variant">วันที่</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant">รายการ</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant text-right">หมวดหมู่</span>
            </div>
            <div className="divide-y divide-surface-container-low">
              {monthExpenses.slice(0, 10).map((tx) => {
                const style = getCategoryStyle(tx.category || "");
                return (
                  <div key={tx.id} className="px-4 py-4 grid grid-cols-3 items-center hover:bg-surface-container-low transition-colors">
                    <div>
                      <p className="font-label-caps text-label-caps text-on-surface">{formatTransactionDate(tx.date)}</p>
                    </div>
                    <div>
                      <p className="font-body-md text-on-surface text-sm truncate">{tx.description || getCategoryLabel(tx.category)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-caps text-label-caps ${style.bg} ${style.color}`}>
                        {getCategoryLabel(tx.category)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-5 border-t border-surface-container-low flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                Showing 1 to {Math.min(10, monthExpenses.length)} of {monthExpenses.length} expenses
              </span>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button className="p-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
