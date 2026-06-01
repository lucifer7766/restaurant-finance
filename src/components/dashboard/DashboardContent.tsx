"use client";

import Link from "next/link";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { useMonthFilter } from "@/context/MonthFilterContext";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import {
  filterTransactionsByMonth,
  getMonthlyReportFromTransactions,
  getMonthlyStatsFromTransactions,
  getRevenueHistoryFromTransactions,
} from "@/lib/data";
import { formatBaht, formatMonthLabel, formatTransactionDate, getCategoryLabel } from "@/lib/utils";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardContent() {
  const { selectedMonth } = useMonthFilter();
  const { transactions, isLoading, error } = useTransactions();

  const monthLabel = formatMonthLabel(selectedMonth);

  const previousMonthKey = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  })();

  const report = getMonthlyReportFromTransactions(transactions, selectedMonth);
  const prevReport = getMonthlyReportFromTransactions(transactions, previousMonthKey);
  void getMonthlyStatsFromTransactions(transactions, selectedMonth);
  const revenueHistory = getRevenueHistoryFromTransactions(transactions);
  const selectedMonthTransactions = filterTransactionsByMonth(transactions, selectedMonth);

  const revenueGrowth =
    prevReport.totalIncome > 0
      ? ((report.totalIncome - prevReport.totalIncome) / prevReport.totalIncome) * 100
      : 0;
  const expenseGrowth =
    prevReport.totalExpenses > 0
      ? ((report.totalExpenses - prevReport.totalExpenses) / prevReport.totalExpenses) * 100
      : 0;

  const today = getTodayKey();
  const todayTxns = transactions.filter((tx) => tx.date === today);
  const todayIncome = todayTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const todayExpenses = todayTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const todayNet = todayIncome - todayExpenses;
  const totalExpensesSum = report.expenseBreakdown.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-5">

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
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/transactions" className="btn-primary flex-1 text-center">
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          เพิ่มรายรับ
        </Link>
        <Link href="/transactions" className="btn-secondary flex-1 text-center">
          <span className="material-symbols-outlined text-[18px]">remove_circle</span>
          เพิ่มรายจ่าย
        </Link>
      </div>

      {/* ── Error banner ───────────────────────────────────── */}
      {error && (
        <div className="sand-card p-4 rounded-xl flex items-center gap-3 border-l-4 border-error">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-on-surface">{error}</p>
        </div>
      )}

      {/* ── Metric cards ───────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="metric-card rounded-2xl p-7 animate-pulse">
              <div className="h-3 bg-surface-container-highest rounded w-1/3 mb-5" />
              <div className="h-12 bg-surface-container-highest rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* รายรับเดือนนี้ */}
          <div className="metric-card p-7 rounded-2xl">
            <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">
              รายรับเดือนนี้
            </span>
            <div className="flex items-baseline gap-2 text-primary">
              <span className="text-2xl font-bold opacity-60">฿</span>
              <span className="font-display-currency text-display-currency tracking-tight leading-none">
                {report.totalIncome.toLocaleString("th-TH")}
              </span>
            </div>
            {revenueGrowth !== 0 && (
              <div className={`mt-3 flex items-center gap-1.5 ${revenueGrowth > 0 ? "text-primary" : "text-error"}`}>
                <span className="material-symbols-outlined text-[16px]">
                  {revenueGrowth > 0 ? "trending_up" : "trending_down"}
                </span>
                <span className="font-label-caps text-label-caps">
                  {revenueGrowth > 0 ? "+" : ""}{revenueGrowth.toFixed(1)}% เทียบกับเดือนก่อน
                </span>
              </div>
            )}
          </div>

          {/* รายจ่ายเดือนนี้ */}
          <div className="metric-card p-7 rounded-2xl">
            <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">
              รายจ่ายเดือนนี้
            </span>
            <div className="flex items-baseline gap-2 text-error">
              <span className="text-2xl font-bold opacity-60">฿</span>
              <span className="font-display-currency text-display-currency tracking-tight leading-none">
                {report.totalExpenses.toLocaleString("th-TH")}
              </span>
            </div>
            {expenseGrowth !== 0 && (
              <div className={`mt-3 flex items-center gap-1.5 ${expenseGrowth > 0 ? "text-error" : "text-primary"}`}>
                <span className="material-symbols-outlined text-[16px]">
                  {expenseGrowth > 0 ? "trending_up" : "trending_down"}
                </span>
                <span className="font-label-caps text-label-caps">
                  {expenseGrowth > 0 ? "+" : ""}{expenseGrowth.toFixed(1)}% เทียบกับเดือนก่อน
                </span>
              </div>
            )}
          </div>

          {/* กำไรสุทธิ */}
          <div className="metric-card p-7 rounded-2xl">
            <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">
              กำไรสุทธิ
            </span>
            <div className={`flex items-baseline gap-2 ${report.netProfit >= 0 ? "text-primary" : "text-error"}`}>
              <span className="text-2xl font-bold opacity-60">฿</span>
              <span className="text-4xl font-bold font-headline-md tracking-tight">
                {Math.abs(report.netProfit).toLocaleString("th-TH")}
              </span>
            </div>
            {report.netProfit < 0 && (
              <p className="mt-2 font-label-caps text-label-caps text-error">ขาดทุน</p>
            )}
          </div>

          {/* อัตรากำไร */}
          <div className="metric-card p-7 rounded-2xl">
            <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">
              อัตรากำไร
            </span>
            <div className="flex items-center gap-4 mb-3">
              <span className="text-4xl font-bold font-headline-md text-on-surface tracking-tight">
                {report.profitMargin.toFixed(1)}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(Math.max(report.profitMargin, 0), 100)}%` }}
              />
            </div>
          </div>

        </div>
      )}

      {/* ── เน็ตวันนี้ ──────────────────────────────────────── */}
      <div className="metric-card p-6 rounded-2xl">
        <span className="font-label-caps text-label-caps text-on-surface-variant block mb-2">
          เน็ตวันนี้
        </span>
        <div className={`flex items-baseline gap-2 ${todayNet >= 0 ? "text-on-surface" : "text-error"}`}>
          <span className="text-xl font-bold opacity-60">฿</span>
          <span className="text-3xl font-bold font-headline-md">
            {Math.abs(todayNet).toLocaleString("th-TH")}
          </span>
        </div>
        <p className="mt-2 font-label-caps text-label-caps text-on-surface-variant">
          รายรับ {formatBaht(todayIncome)} · รายจ่าย {formatBaht(todayExpenses)}
        </p>
      </div>

      {/* ── Revenue vs Expenses Chart ───────────────────────── */}
      <div className="metric-card p-7 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-headline-md text-headline-md text-on-surface">
            แนวโน้มรายรับ vs รายจ่าย
          </h3>
        </div>
        <RevenueChart data={revenueHistory} />
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

      {/* ── Recent Transactions ────────────────────────────── */}
      <div className="metric-card rounded-2xl overflow-hidden">
        <div className="p-7 pb-0">
          <h3 className="font-headline-md text-headline-md text-on-surface">รายการล่าสุด</h3>
          <p className="mt-1 font-label-caps text-label-caps text-on-surface-variant">
            {selectedMonthTransactions.length} รายการใน{monthLabel}
          </p>
        </div>
        {isLoading ? (
          <p className="px-7 py-10 text-center font-body-md text-on-surface-variant">กำลังโหลด...</p>
        ) : selectedMonthTransactions.length === 0 ? (
          <p className="px-7 py-10 text-center font-body-md text-on-surface-variant">ไม่มีรายการใน{monthLabel}</p>
        ) : (
          <>
            <div className="mt-5 divide-y divide-surface-container-low">
              {selectedMonthTransactions.slice(0, 8).map((tx) => (
                <div key={tx.id} className="px-7 py-4 flex items-center gap-4 hover:bg-surface-container-low transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.type === "income" ? "bg-primary-container" : "bg-error-container"
                  }`}>
                    <span className={`material-symbols-outlined text-[18px] ${
                      tx.type === "income" ? "text-on-primary-container" : "text-on-error-container"
                    }`}>
                      {tx.type === "income" ? "arrow_upward" : "arrow_downward"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-on-surface truncate">{tx.description || getCategoryLabel(tx.category)}</p>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">
                      {getCategoryLabel(tx.category)} · {formatTransactionDate(tx.date)}
                    </p>
                  </div>
                  <div className={`font-price-table text-price-table shrink-0 ${
                    tx.type === "income" ? "text-primary" : "text-error"
                  }`}>
                    {tx.type === "income" ? "+" : "-"}{formatBaht(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-surface-container-low">
              <Link
                href="/transactions"
                className="block w-full text-center py-3 rounded-xl bg-surface-container font-body-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                ดูรายการทั้งหมด
              </Link>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
