"use client";

import { RevenueChart } from "@/components/charts/RevenueChart";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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

export function DashboardContent() {
  const { selectedMonth } = useMonthFilter();
  const { transactions, isLoading, error } = useTransactions();

  const monthlyStats = getMonthlyStatsFromTransactions(transactions, selectedMonth);
  const selectedMonthReport = getMonthlyReportFromTransactions(transactions, selectedMonth);
  const revenueHistory = getRevenueHistoryFromTransactions(transactions);
  const selectedMonthTransactions = filterTransactionsByMonth(transactions, selectedMonth);
  const monthLabel = formatMonthLabel(selectedMonth);
  const currentMonth = new Date(selectedMonth + "-01");

const previousMonth = new Date(currentMonth);
previousMonth.setMonth(previousMonth.getMonth() - 1);

const previousMonthKey = `${previousMonth.getFullYear()}-${String(
  previousMonth.getMonth() + 1
).padStart(2, "0")}`;

const previousReport = getMonthlyReportFromTransactions(
  transactions,
  previousMonthKey
);

const revenueGrowth =
  previousReport.totalIncome > 0
    ? ((selectedMonthReport.totalIncome - previousReport.totalIncome) /
        previousReport.totalIncome) *
      100
    : 0;

const expenseGrowth =
  previousReport.totalExpenses > 0
    ? ((selectedMonthReport.totalExpenses - previousReport.totalExpenses) /
        previousReport.totalExpenses) *
      100
    : 0;

const profitGrowth =
  previousReport.netProfit !== 0
    ? ((selectedMonthReport.netProfit - previousReport.netProfit) /
        Math.abs(previousReport.netProfit)) *
      100
    : 0;

  const today = getTodayKey();
  const todayTransactions = transactions.filter((tx) => tx.date === today);

  const todayIncome = todayTransactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const todayExpenses = todayTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const todayProfit = todayIncome - todayExpenses;

  const profitMargin =
    selectedMonthReport.totalIncome > 0
      ? (selectedMonthReport.netProfit / selectedMonthReport.totalIncome) * 100
      : 0;

  const expenseByCategory = selectedMonthTransactions
    .filter((tx) => tx.type === "expense")
    .reduce<Record<string, number>>((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});

  const topExpense = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0];

  const aiSummary =
  selectedMonthTransactions.length === 0
    ? `ยังไม่มีข้อมูลใน ${monthLabel} ให้เริ่มบันทึกรายรับและรายจ่ายก่อนเพื่อสร้างรายงาน`
    : selectedMonthReport.netProfit >= 0
      ? `เดือน ${monthLabel} ร้านมีรายรับ ${formatBaht(
          selectedMonthReport.totalIncome
        )} รายจ่าย ${formatBaht(
          Object.values(expenseByCategory).reduce((sum, value) => sum + value, 0)
        )} และมีกำไรสุทธิ ${formatBaht(
          selectedMonthReport.netProfit
        )} คิดเป็นอัตรากำไร ${profitMargin.toFixed(
          1
        )}% หมวดค่าใช้จ่ายสูงสุดคือ ${
          topExpense ? getCategoryLabel(topExpense[0]) : "ไม่มีข้อมูล"
        } ควรติดตามต้นทุนหมวดนี้อย่างใกล้ชิด`
      : `เดือน ${monthLabel} ร้านมีผลขาดทุน ${formatBaht(
          Math.abs(selectedMonthReport.netProfit)
        )} โดยมีรายจ่ายรวม ${formatBaht(
          Object.values(expenseByCategory).reduce((sum, value) => sum + value, 0)
        )} ควรวิเคราะห์หมวดค่าใช้จ่ายหลักและเพิ่มยอดขายในช่วงวันที่รายได้ต่ำ`;

  return (
    <div className="space-y-6">
      {error ? (
        <Card>
          <CardContent>
            <p className="py-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
  metric={{
    label: "Today Income",
    value: todayIncome,
    format: "currency",
    change: 0,
  }}
/>

<StatCard
  metric={{
    label: "Today Expense",
    value: todayExpenses,
    format: "currency",
    change: 0,
  }}
/>

<StatCard
  metric={{
    label: "Today Profit",
    value: todayProfit,
    format: "currency",
    change: 0,
  }}
/>
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Loading dashboard...
          </div>
        ) : (
          monthlyStats.map((metric) => <StatCard key={metric.label} metric={metric} />)
        )}
      </section>


      <Card>
  <CardHeader>
    <CardTitle>Trend Analysis</CardTitle>
    <p className="mt-1 text-xs text-zinc-400">
      เปรียบเทียบกับเดือนก่อนหน้า
    </p>
  </CardHeader>

  <CardContent>
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <p className="text-xs text-zinc-400">Revenue Growth</p>
        <p className="mt-2 text-2xl font-bold text-green-400">
          {revenueGrowth.toFixed(1)}%
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <p className="text-xs text-zinc-400">Expense Growth</p>
        <p className="mt-2 text-2xl font-bold text-red-400">
          {expenseGrowth.toFixed(1)}%
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <p className="text-xs text-zinc-400">Profit Growth</p>
        <p className="mt-2 text-2xl font-bold text-blue-400">
          {profitGrowth.toFixed(1)}%
        </p>
      </div>
    </div>
  </CardContent>
</Card>

      <Card>
        <CardHeader>
          <CardTitle>AI-style Summary</CardTitle>
          <p className="mt-1 text-xs text-zinc-400">สรุปภาพรวมการเงินแบบอ่านง่าย</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-zinc-300">{aiSummary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Expenses</CardTitle>
          <p className="mt-1 text-xs text-zinc-400">
            From Supabase transactions · selected month: {monthLabel}
            {selectedMonthReport.totalIncome > 0
              ? ` (${formatBaht(selectedMonthReport.totalIncome)} revenue)`
              : ""}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Loading chart...
            </p>
          ) : (
            <RevenueChart data={revenueHistory} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <p className="mt-1 text-xs text-zinc-400">รายจ่ายแยกตามหมวดหมู่ใน {monthLabel}</p>
        </CardHeader>
        <CardContent>
          {Object.keys(expenseByCategory).length === 0 ? (
            <p className="py-4 text-sm text-zinc-400">ยังไม่มีรายจ่ายในเดือนนี้</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(expenseByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3"
                  >
                    <span className="text-sm text-zinc-300">{getCategoryLabel(category)}</span>
                    <span className="text-sm font-medium text-red-400">{formatBaht(amount)}</span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <p className="mt-1 text-xs text-zinc-400">
            {selectedMonthTransactions.length} records in {monthLabel}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <p className="px-6 py-8 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : isLoading ? (
            <p className="px-6 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Loading transactions...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMonthTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400"
                      >
                        No transactions for {monthLabel}.
                      </td>
                    </tr>
                  ) : (
                    selectedMonthTransactions.slice(0, 8).map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-zinc-50 last:border-0 dark:border-zinc-900"
                      >
                        <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                        {tx.description || "-"}
                        </td>
                        <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">
                          {getCategoryLabel(tx.category)}
                        </td>
                        <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">
                          {formatTransactionDate(tx.date)}
                        </td>
                        <td
                          className={`px-6 py-3 text-right font-medium ${
                            tx.type === "income"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"}
                          {formatBaht(tx.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}