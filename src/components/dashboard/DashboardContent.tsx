"use client";

import { RevenueChart } from "@/components/charts/RevenueChart";
import { useMonthFilter } from "@/context/MonthFilterContext";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import {
  filterTransactionsByMonth,
  getMonthlyReportFromTransactions,
  getMonthlyStatsFromTransactions,
  getRevenueHistoryFromTransactions,
} from "@/lib/data";
import {
  formatBaht,
  formatMonthLabel,
  formatTransactionDate,
  getCategoryLabel,
} from "@/lib/utils";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function GrowthBadge({ change }: { change: number }) {
  if (change === 0) return null;
  const up = change > 0;
  return (
    <div
      className={`mt-4 flex items-center gap-2 ${up ? "text-primary" : "text-error"}`}
    >
      <span className="material-symbols-outlined text-sm">
        {up ? "trending_up" : "trending_down"}
      </span>
      <span className="font-label-caps text-label-caps">
        {up ? "+" : ""}
        {change.toFixed(1)}% เทียบกับเดือนก่อน
      </span>
    </div>
  );
}

export function DashboardContent() {
  const { selectedMonth } = useMonthFilter();
  const { transactions, isLoading, error } = useTransactions();

  const monthLabel = formatMonthLabel(selectedMonth);

  const previousMonthKey = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return m === 1
      ? `${y - 1}-12`
      : `${y}-${String(m - 1).padStart(2, "0")}`;
  })();

  const report = getMonthlyReportFromTransactions(transactions, selectedMonth);
  const prevReport = getMonthlyReportFromTransactions(transactions, previousMonthKey);
  const monthlyStats = getMonthlyStatsFromTransactions(transactions, selectedMonth);
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
  const todayIncome = todayTxns
    .filter((tx) => tx.type === "income")
    .reduce((s, tx) => s + tx.amount, 0);
  const todayExpenses = todayTxns
    .filter((tx) => tx.type === "expense")
    .reduce((s, tx) => s + tx.amount, 0);
  const todayNet = todayIncome - todayExpenses;

  // unused but kept for parity — monthlyStats[3] has margin
  void monthlyStats;

  const totalExpensesSum = report.expenseBreakdown.reduce(
    (s, e) => s + e.amount,
    0,
  );

  return (
    <div className="space-y-stack-md">
      {/* ── Header ─────────────────────────────────────────── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-gutter">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg mb-2 text-on-surface">
            สรุปภาพรวมธุรกิจ
          </h2>
          <p className="text-on-surface-variant font-body-md">{monthLabel}</p>
        </div>
      </section>

      {/* ── Error banner ───────────────────────────────────── */}
      {error && (
        <div className="sand-card p-4 rounded-xl flex items-center gap-3 border-l-4 border-error">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-on-surface">{error}</p>
        </div>
      )}

      {/* ── Bento Grid ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-gutter">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`${i < 2 ? "md:col-span-3" : "md:col-span-2"} metric-card rounded-2xl border border-surface-variant p-8 animate-pulse`}
            >
              <div className="h-3 bg-surface-container-highest rounded w-1/3 mb-6" />
              <div className="h-10 bg-surface-container-highest rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-gutter">
          {/* รายรับ */}
          <div className="md:col-span-3 metric-card p-8 rounded-2xl border border-surface-variant">
            <span className="font-label-caps text-label-caps text-on-surface-variant block mb-4">
              รายรับเดือนนี้
            </span>
            <div className="flex items-baseline gap-2 text-primary">
              <span className="text-3xl font-bold opacity-70">฿</span>
              <span className="font-display-currency text-display-currency tracking-tight">
                {report.totalIncome.toLocaleString("th-TH")}
              </span>
            </div>
            <GrowthBadge change={revenueGrowth} />
          </div>

          {/* รายจ่าย */}
          <div className="md:col-span-3 metric-card p-8 rounded-2xl border border-surface-variant">
            <span className="font-label-caps text-label-caps text-on-surface-variant block mb-4">
              รายจ่ายเดือนนี้
            </span>
            <div className="flex items-baseline gap-2 text-error">
              <span className="text-3xl font-bold opacity-70">฿</span>
              <span className="font-display-currency text-display-currency tracking-tight">
                {report.totalExpenses.toLocaleString("th-TH")}
              </span>
            </div>
            <GrowthBadge change={expenseGrowth} />
          </div>

          {/* กำไรสุทธิ */}
          <div className="md:col-span-2 metric-card p-6 rounded-2xl border border-surface-variant">
            <span className="font-label-caps text-label-caps text-on-surface-variant block mb-2">
              กำไรสุทธิ
            </span>
            <div
              className={`flex items-baseline gap-2 ${report.netProfit >= 0 ? "text-primary" : "text-error"}`}
            >
              <span className="text-xl font-bold opacity-70">฿</span>
              <span className="text-3xl font-bold font-headline-md">
                {Math.abs(report.netProfit).toLocaleString("th-TH")}
              </span>
            </div>
          </div>

          {/* อัตรากำไร */}
          <div className="md:col-span-2 metric-card p-6 rounded-2xl border border-surface-variant">
            <span className="font-label-caps text-label-caps text-on-surface-variant block mb-2">
              อัตรากำไร
            </span>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold font-headline-md text-on-surface">
                {report.profitMargin.toFixed(1)}%
              </span>
              <div className="h-2 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(Math.max(report.profitMargin, 0), 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* วันนี้ */}
          <div className="md:col-span-2 metric-card p-6 rounded-2xl border border-surface-variant">
            <span className="font-label-caps text-label-caps text-on-surface-variant block mb-2">
              กำไรวันนี้
            </span>
            <div
              className={`flex items-baseline gap-2 ${todayNet >= 0 ? "text-on-surface" : "text-error"}`}
            >
              <span className="text-xl font-bold opacity-70">฿</span>
              <span className="text-3xl font-bold font-headline-md">
                {Math.abs(todayNet).toLocaleString("th-TH")}
              </span>
            </div>
            <p className="mt-2 font-label-caps text-label-caps text-on-surface-variant">
              รายรับ {formatBaht(todayIncome)} · รายจ่าย {formatBaht(todayExpenses)}
            </p>
          </div>
        </div>
      )}

      {/* ── Revenue vs Expenses Chart ───────────────────────── */}
      <section className="metric-card p-8 rounded-2xl border border-surface-variant">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-headline-md text-headline-md text-on-surface">
            แนวโน้มรายรับ vs รายจ่าย
          </h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                รายรับ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-error" />
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                รายจ่าย
              </span>
            </div>
          </div>
        </div>
        <RevenueChart data={revenueHistory} />
      </section>

      {/* ── Expense Breakdown ──────────────────────────────── */}
      <section className="metric-card p-8 rounded-2xl border border-surface-variant">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-6">
          สัดส่วนรายจ่ายตามหมวดหมู่
        </h3>
        {report.expenseBreakdown.length === 0 ? (
          <p className="font-body-md text-on-surface-variant py-4">
            ยังไม่มีรายจ่ายในเดือนนี้
          </p>
        ) : (
          <div className="space-y-3">
            {report.expenseBreakdown.map(({ category, amount }) => {
              const pct =
                totalExpensesSum > 0 ? (amount / totalExpensesSum) * 100 : 0;
              return (
                <div
                  key={category}
                  className="bg-surface-container-lowest p-4 rounded-xl border border-surface-variant flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-on-surface">
                      {getCategoryLabel(category)}
                    </p>
                    <div className="mt-2 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className="h-full bg-error transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-price-table text-price-table text-on-surface">
                      {formatBaht(amount)}
                    </p>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">
                      {pct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Recent Transactions ────────────────────────────── */}
      <section className="metric-card rounded-2xl border border-surface-variant overflow-hidden">
        <div className="p-8 pb-0">
          <h3 className="font-headline-md text-headline-md text-on-surface">
            รายการล่าสุด
          </h3>
          <p className="mt-1 font-label-caps text-label-caps text-on-surface-variant">
            {selectedMonthTransactions.length} รายการใน{monthLabel}
          </p>
        </div>

        {isLoading ? (
          <p className="px-8 py-10 text-center font-body-md text-on-surface-variant">
            กำลังโหลด...
          </p>
        ) : selectedMonthTransactions.length === 0 ? (
          <p className="px-8 py-10 text-center font-body-md text-on-surface-variant">
            ไม่มีรายการใน{monthLabel}
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-variant text-left">
                  <th className="px-8 py-3 font-label-caps text-label-caps text-on-surface-variant">
                    รายละเอียด
                  </th>
                  <th className="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant">
                    หมวดหมู่
                  </th>
                  <th className="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant">
                    วันที่
                  </th>
                  <th className="px-8 py-3 font-label-caps text-label-caps text-on-surface-variant text-right">
                    จำนวนเงิน
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedMonthTransactions.slice(0, 8).map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-surface-variant last:border-0 hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-8 py-4 font-body-md text-on-surface">
                      {tx.description || "-"}
                    </td>
                    <td className="px-6 py-4 font-body-md text-on-surface-variant">
                      {getCategoryLabel(tx.category)}
                    </td>
                    <td className="px-6 py-4 font-body-md text-on-surface-variant">
                      {formatTransactionDate(tx.date)}
                    </td>
                    <td
                      className={`px-8 py-4 text-right font-price-table text-price-table ${
                        tx.type === "income" ? "text-primary" : "text-error"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatBaht(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
