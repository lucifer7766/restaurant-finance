"use client";

import { useMemo, useState } from "react";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { useMonthFilter } from "@/context/MonthFilterContext";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import {
  filterTransactionsByMonth,
  getMonthlyReportFromTransactions,
} from "@/lib/data";
import { formatBaht, formatMonthLabel, formatTransactionDate, getCategoryLabel } from "@/lib/utils";

const THAI_MONTHS_SHORT = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

export function DashboardContent() {
  const { selectedMonth, availableMonths } = useMonthFilter();
  const { transactions, isLoading, error } = useTransactions();
  const [showAllTx, setShowAllTx] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [compareMonth, setCompareMonth] = useState("");

  const monthLabel = formatMonthLabel(selectedMonth);

  const previousMonthKey = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  })();

  const report     = useMemo(() => getMonthlyReportFromTransactions(transactions, selectedMonth),     [transactions, selectedMonth]);
  const prevReport = useMemo(() => getMonthlyReportFromTransactions(transactions, previousMonthKey),  [transactions, previousMonthKey]);
  const selectedMonthTransactions = useMemo(() => filterTransactionsByMonth(transactions, selectedMonth), [transactions, selectedMonth]);

  /* weekly cumulative chart data for selected month */
  const weeklyChartData = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthAbbr = THAI_MONTHS_SHORT[m - 1];
    const monthTxns = filterTransactionsByMonth(transactions, selectedMonth);

    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const isCurrentMonth = selectedMonth === currentMonthKey;
    const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;

    const rawPoints = [
      { day: 7,      label: `7 ${monthAbbr}` },
      { day: 14,     label: `14 ${monthAbbr}` },
      { day: 21,     label: `21 ${monthAbbr}` },
      { day: lastDay, label: isCurrentMonth ? "วันนี้" : `${daysInMonth} ${monthAbbr}` },
    ].filter((p, i, arr) => i === 0 || p.day > arr[i - 1].day);

    return rawPoints.map(({ day, label }) => {
      const txns = monthTxns.filter((tx) => parseInt(tx.date.slice(8, 10)) <= day);
      return {
        month: label,
        revenue: txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expenses: txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [transactions, selectedMonth]);

  const revenueGrowth = prevReport.totalIncome > 0
    ? ((report.totalIncome - prevReport.totalIncome) / prevReport.totalIncome) * 100
    : 0;
  const expenseGrowth = prevReport.totalExpenses > 0
    ? ((report.totalExpenses - prevReport.totalExpenses) / prevReport.totalExpenses) * 100
    : 0;

  /* cumulative net across ALL time = approximate cash position */
  const cumulativeNet = useMemo(
    () => transactions.reduce((s, t) => t.type === "income" ? s + t.amount : s - t.amount, 0),
    [transactions]
  );

  /* alert banner */
  const alert = useMemo(() => {
    if (transactions.length === 0) {
      return { icon: "info", color: "text-on-surface-variant", message: "สรุปภาพรวมธุรกิจประจำเดือนนี้พร้อมตรวจสอบ" };
    }
    if (report.netProfit < 0) {
      return { icon: "warning", color: "text-error", message: "รายจ่ายสูงกว่ารายรับเดือนนี้ ควรตรวจสอบและลดต้นทุน" };
    }
    if (revenueGrowth > 0) {
      return { icon: "trending_up", color: "text-primary", message: `กำไรเดือนนี้เพิ่มขึ้น ${revenueGrowth.toFixed(1)}% จากเดือนก่อน` };
    }
    if (revenueGrowth < 0) {
      return { icon: "trending_down", color: "text-error", message: `รายรับลดลง ${Math.abs(revenueGrowth).toFixed(1)}% เทียบกับเดือนก่อน ควรเพิ่มยอดขาย` };
    }
    if (revenueGrowth === 0 && prevReport.totalIncome > 0) {
      return { icon: "trending_flat", color: "text-on-surface-variant", message: "รายรับทรงตัวเท่ากับเดือนก่อน" };
    }
    return { icon: "info", color: "text-on-surface-variant", message: "สรุปภาพรวมธุรกิจประจำเดือนนี้พร้อมตรวจสอบ" };
  }, [transactions, report, revenueGrowth, prevReport]);

  const totalExpensesSum = report.expenseBreakdown.reduce((s, e) => s + e.amount, 0);

  function isPOS(tx: { description?: string }) {
    const d = tx.description ?? "";
    return d.startsWith("POS_IMPORT_") || d.startsWith("POS Import:");
  }

  const compareMonthOptions = availableMonths.filter((m) => m !== selectedMonth);
  const effectiveCompareMonth = compareMonth && compareMonth !== selectedMonth ? compareMonth : (compareMonthOptions[compareMonthOptions.length - 1] ?? "");
  const compareReport = useMemo(
    () => effectiveCompareMonth ? getMonthlyReportFromTransactions(transactions, effectiveCompareMonth) : null,
    [transactions, effectiveCompareMonth]
  );

  function pctDiff(a: number, b: number) {
    if (b === 0) return null;
    return ((a - b) / b) * 100;
  }

  /* Loading skeleton */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <div className="h-7 bg-surface-container-highest rounded w-2/3 mb-2 animate-pulse" />
          <div className="h-3 bg-surface-container-highest rounded w-1/3 animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="flex-1 h-12 bg-surface-container-highest rounded-2xl animate-pulse" />
          <div className="flex-1 h-12 bg-surface-container-highest rounded-2xl animate-pulse" />
        </div>
        <div className="h-14 bg-surface-container-highest rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="metric-card rounded-2xl p-5 animate-pulse">
              <div className="h-3 bg-surface-container-highest rounded w-1/2 mb-4" />
              <div className="h-8 bg-surface-container-highest rounded w-3/4" />
            </div>
          ))}
        </div>
        <div className="metric-card rounded-2xl p-5 animate-pulse">
          <div className="h-3 bg-surface-container-highest rounded w-1/3 mb-4" />
          <div className="h-8 bg-surface-container-highest rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Page header ────────────────────────────────────── */}
      <div>
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-0.5">
          สรุปภาพรวมธุรกิจ
        </h2>
        <p className="font-label-caps text-label-caps text-on-surface-variant">
          ข้อมูลล่าสุดประจำเดือนนี้ · {monthLabel}
        </p>
      </div>

      {/* ── Action buttons ─────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowCompare(true)}
          className="btn-secondary flex-1"
          aria-label="เปรียบเทียบเดือน"
        >
          <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
          เปรียบเทียบเดือน
        </button>
      </div>

      {/* ── Alert Banner ───────────────────────────────────── */}
      <div className="sand-card px-4 py-3 rounded-xl flex items-center gap-3">
        <span className={`material-symbols-outlined text-[20px] shrink-0 ${alert.color}`}>
          {alert.icon}
        </span>
        <p className="flex-1 font-body-md text-on-surface text-sm">{alert.message}</p>
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">chevron_right</span>
      </div>

      {/* ── Error banner ───────────────────────────────────── */}
      {error && (
        <div className="sand-card p-4 rounded-xl flex items-center gap-3 border-l-4 border-error">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-on-surface">{error}</p>
        </div>
      )}

      {/* ── KPI Row 1: รายรับ | รายจ่าย ───────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* รายรับเดือนนี้ */}
        <div className="metric-card p-5 rounded-2xl">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">
            รายรับเดือนนี้
          </span>
          <div className="flex items-baseline gap-1 text-primary">
            <span className="text-base font-bold opacity-60">฿</span>
            <span className="text-2xl font-bold font-headline-md tracking-tight leading-none">
              {report.totalIncome.toLocaleString("th-TH")}
            </span>
          </div>
          {revenueGrowth !== 0 && (
            <div className={`mt-2 flex items-center gap-1 ${revenueGrowth > 0 ? "text-primary" : "text-error"}`}>
              <span className="material-symbols-outlined text-[14px]">
                {revenueGrowth > 0 ? "trending_up" : "trending_down"}
              </span>
              <span className="font-label-caps text-label-caps" style={{ fontSize: "10px" }}>
                {revenueGrowth > 0 ? "+" : ""}{revenueGrowth.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* รายจ่ายเดือนนี้ */}
        <div className="metric-card p-5 rounded-2xl">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">
            รายจ่ายเดือนนี้
          </span>
          <div className="flex items-baseline gap-1 text-error">
            <span className="text-base font-bold opacity-60">฿</span>
            <span className="text-2xl font-bold font-headline-md tracking-tight leading-none">
              {report.totalExpenses.toLocaleString("th-TH")}
            </span>
          </div>
          {expenseGrowth !== 0 && (
            <div className={`mt-2 flex items-center gap-1 ${expenseGrowth > 0 ? "text-error" : "text-primary"}`}>
              <span className="material-symbols-outlined text-[14px]">
                {expenseGrowth > 0 ? "trending_up" : "trending_down"}
              </span>
              <span className="font-label-caps text-label-caps" style={{ fontSize: "10px" }}>
                {expenseGrowth > 0 ? "+" : ""}{expenseGrowth.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

      </div>

      {/* ── KPI Row 2: กำไรสุทธิ | อัตรากำไร ──────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* กำไรสุทธิ */}
        <div className="metric-card p-5 rounded-2xl">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">
            กำไรสุทธิ
          </span>
          <div className={`flex items-baseline gap-1 ${report.netProfit >= 0 ? "text-on-surface" : "text-error"}`}>
            <span className="text-base font-bold opacity-60">฿</span>
            <span className="text-2xl font-bold font-headline-md tracking-tight leading-none">
              {Math.abs(report.netProfit).toLocaleString("th-TH")}
            </span>
          </div>
          {report.netProfit < 0 && (
            <p className="mt-1 font-label-caps text-label-caps text-error" style={{ fontSize: "10px" }}>ขาดทุน</p>
          )}
        </div>

        {/* อัตรากำไร */}
        <div className="metric-card p-5 rounded-2xl">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">
            อัตรากำไร
          </span>
          <span className="text-2xl font-bold font-headline-md text-on-surface tracking-tight">
            {report.profitMargin.toFixed(1)}%
          </span>
          <div className="mt-3 h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(Math.max(report.profitMargin, 0), 100)}%` }}
            />
          </div>
        </div>

      </div>

      {/* ── KPI Row 3: ยอดสะสมสุทธิ (full width) ──────────── */}
      <div className="metric-card p-5 rounded-2xl">
        <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">
          เงินสดคงเหลือ (สะสม)
        </span>
        <div className={`flex items-baseline gap-2 ${cumulativeNet >= 0 ? "text-on-surface" : "text-error"}`}>
          <span className="text-2xl font-bold opacity-60">฿</span>
          <span className="font-display-currency text-display-currency tracking-tight leading-none">
            {Math.abs(cumulativeNet).toLocaleString("th-TH")}
          </span>
        </div>
        {cumulativeNet < 0 && (
          <p className="mt-1 font-label-caps text-label-caps text-error">ยอดติดลบ</p>
        )}
      </div>

      {/* ── Revenue vs Expenses Chart ───────────────────────── */}
      <div className="metric-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              แนวโน้มรายรับ vs รายจ่าย
            </h3>
            <p className="font-label-caps text-label-caps text-on-surface-variant mt-0.5">
              สะสมรายสัปดาห์ · {monthLabel}
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 rounded-full bg-primary" />
              <span className="font-label-caps text-label-caps text-on-surface-variant">รายรับ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 rounded-full bg-error" />
              <span className="font-label-caps text-label-caps text-on-surface-variant">รายจ่าย</span>
            </div>
          </div>
        </div>
        <RevenueChart data={weeklyChartData} />
      </div>

      {/* ── Expense Breakdown ──────────────────────────────── */}
      <div className="metric-card p-7 rounded-2xl">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-5">
          สัดส่วนรายจ่ายตามหมวดหมู่
        </h3>
        {report.expenseBreakdown.length === 0 ? (
          <p className="font-body-md text-on-surface-variant py-4">ยังไม่มีรายจ่ายในเดือนนี้</p>
        ) : (
          <div className="space-y-3">
            {report.expenseBreakdown.map(({ category, amount }) => {
              const pct = totalExpensesSum > 0 ? (amount / totalExpensesSum) * 100 : 0;
              return (
                <div key={category} className="p-4 rounded-xl bg-surface-container-low flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-primary-container text-[18px]">
                      receipt_long
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-on-surface">{getCategoryLabel(category)}</p>
                    <div className="mt-1.5 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-error rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-price-table text-price-table text-on-surface">{formatBaht(amount)}</p>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">{pct.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent POS Transactions ────────────────────────── */}
      {(() => {
        const posTxns = selectedMonthTransactions.filter(isPOS);
        return (
          <div className="metric-card rounded-2xl overflow-hidden">
            <div className="p-7 pb-0 flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">รายการ POS ล่าสุด</h3>
              {posTxns.length > 5 && (
                <button
                  onClick={() => setShowAllTx((v) => !v)}
                  className="font-label-caps text-label-caps text-primary hover:underline transition-colors"
                >
                  {showAllTx ? "แสดงน้อยลง" : "รายการทั้งหมด"}
                </button>
              )}
            </div>

            {posTxns.length === 0 ? (
              <p className="px-7 py-10 text-center font-body-md text-on-surface-variant">ไม่มีรายการ POS ใน{monthLabel}</p>
            ) : (
              <div className="mt-4 divide-y divide-surface-container-low">
                {(showAllTx ? posTxns : posTxns.slice(0, 5)).map((tx) => (
                  <div key={tx.id} className="px-5 py-4 flex items-center gap-3 hover:bg-surface-container-low transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary-container">
                      <span className="material-symbols-outlined text-[18px] text-on-primary-container">point_of_sale</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-on-surface truncate">POS · {getCategoryLabel(tx.category)}</p>
                      <p className="font-label-caps text-label-caps text-on-surface-variant">
                        {formatTransactionDate(tx.date)}
                      </p>
                    </div>
                    <div className="font-price-table text-price-table shrink-0 text-primary">
                      +{formatBaht(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}


      {/* ── Compare Drawer ─────────────────────────────────── */}
      {showCompare && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setShowCompare(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-surface shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-container-low">
              <h3 className="font-headline-md text-headline-md text-on-surface">เปรียบเทียบเดือน</h3>
              <button onClick={() => setShowCompare(false)} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
              </button>
            </div>

            {/* Month picker */}
            <div className="px-6 py-4 border-b border-surface-container-low">
              <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">เลือกเดือนที่ต้องการเปรียบเทียบกับ {monthLabel}</p>
              <select
                value={compareMonth || effectiveCompareMonth}
                onChange={(e) => setCompareMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container text-on-surface font-body-md border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {compareMonthOptions.map((m) => (
                  <option key={m} value={m}>{formatMonthLabel(m)}</option>
                ))}
              </select>
            </div>

            {/* Comparison rows */}
            {compareReport && (() => {
              const rows = [
                { label: "รายรับ", current: report.totalIncome, compare: compareReport.totalIncome, positive: true },
                { label: "รายจ่าย", current: report.totalExpenses, compare: compareReport.totalExpenses, positive: false },
                { label: "กำไรสุทธิ", current: report.netProfit, compare: compareReport.netProfit, positive: true },
                { label: "อัตรากำไร", current: report.profitMargin, compare: compareReport.profitMargin, positive: true, isPercent: true },
              ];
              return (
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  {/* Column headers */}
                  <div className="grid grid-cols-3 gap-2 mb-1">
                    <div />
                    <p className="font-label-caps text-label-caps text-primary text-center">{monthLabel}</p>
                    <p className="font-label-caps text-label-caps text-on-surface-variant text-center">{formatMonthLabel(effectiveCompareMonth)}</p>
                  </div>
                  {rows.map(({ label, current, compare, positive, isPercent }) => {
                    const diff = pctDiff(current, compare);
                    const better = positive ? current >= compare : current <= compare;
                    return (
                      <div key={label} className="metric-card p-4 rounded-2xl">
                        <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">{label}</p>
                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div />
                          <p className={`text-xl font-bold text-center ${better ? "text-primary" : "text-error"}`}>
                            {isPercent ? `${current.toFixed(1)}%` : `฿${Math.abs(current).toLocaleString("th-TH")}`}
                          </p>
                          <p className="text-base font-semibold text-on-surface-variant text-center">
                            {isPercent ? `${compare.toFixed(1)}%` : `฿${Math.abs(compare).toLocaleString("th-TH")}`}
                          </p>
                        </div>
                        {diff !== null && (
                          <div className={`mt-2 flex items-center justify-center gap-1 ${better ? "text-primary" : "text-error"}`}>
                            <span className="material-symbols-outlined text-[14px]">
                              {diff > 0 ? "trending_up" : diff < 0 ? "trending_down" : "trending_flat"}
                            </span>
                            <span className="font-label-caps text-label-caps" style={{ fontSize: "10px" }}>
                              {diff > 0 ? "+" : ""}{diff.toFixed(1)}% จาก{formatMonthLabel(effectiveCompareMonth)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </>
      )}

    </div>
  );
}
