export type RevenuePoint = {
  month: string;
  revenue: number;
  expenses: number;
};

export type StatMetric = {
  label: string;
  value: number;
  change: number;
  format: "currency" | "percent" | "number";
};

export type RecentTransaction = {
  id: string;
  description: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  date: string;
};

export const restaurantName = "PLU";

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const defaultSelectedMonth = "2026-05";

export const availableMonths = monthNames.map(
  (_, index) => `2026-${String(index + 1).padStart(2, "0")}`,
);

function percentChange(current: number, previous: number): number {
  if (previous === 0) {
    return 0;
  }

  return ((current - previous) / previous) * 100;
}

function getPreviousMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (month === 1) {
    return `${year - 1}-12`;
  }

  return `${yearStr}-${String(month - 1).padStart(2, "0")}`;
}

export function filterTransactionsByMonth(
  transactions: RecentTransaction[],
  monthKey: string,
): RecentTransaction[] {
  return transactions.filter((transaction) => transaction.date.startsWith(monthKey));
}

export type CategoryBreakdown = {
  category: string;
  amount: number;
};

export type MonthlyReport = {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  expenseBreakdown: CategoryBreakdown[];
};

export function getMonthlyReportFromTransactions(
  transactions: RecentTransaction[],
  monthKey: string,
): MonthlyReport {
  const monthTransactions = filterTransactionsByMonth(transactions, monthKey);

  let totalIncome = 0;
  let totalExpenses = 0;
  const expenseByCategory: Record<string, number> = {};

  for (const transaction of monthTransactions) {
    if (transaction.type === "income") {
      totalIncome += transaction.amount;
    } else {
      totalExpenses += transaction.amount;
      expenseByCategory[transaction.category] =
        (expenseByCategory[transaction.category] ?? 0) + transaction.amount;
    }
  }

  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const expenseBreakdown = Object.entries(expenseByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    profitMargin,
    expenseBreakdown,
  };
}

export function getMonthlyStatsFromTransactions(
  transactions: RecentTransaction[],
  monthKey: string,
): StatMetric[] {
  const current = getMonthlyReportFromTransactions(transactions, monthKey);
  const previous = getMonthlyReportFromTransactions(
    transactions,
    getPreviousMonthKey(monthKey),
  );

  return [
    {
      label: "Total Revenue",
      value: current.totalIncome,
      change: percentChange(current.totalIncome, previous.totalIncome),
      format: "currency",
    },
    {
      label: "Operating Costs",
      value: current.totalExpenses,
      change: percentChange(current.totalExpenses, previous.totalExpenses),
      format: "currency",
    },
    {
      label: "Net Profit",
      value: current.netProfit,
      change: percentChange(current.netProfit, previous.netProfit),
      format: "currency",
    },
    {
      label: "Profit Margin",
      value: current.profitMargin,
      change: current.profitMargin - previous.profitMargin,
      format: "percent",
    },
  ];
}

export function getRevenueHistoryFromTransactions(
  transactions: RecentTransaction[],
  year = "2026",
): RevenuePoint[] {
  return monthNames.map((monthName, index) => {
    const monthKey = `${year}-${String(index + 1).padStart(2, "0")}`;
    const report = getMonthlyReportFromTransactions(transactions, monthKey);

    return {
      month: monthName,
      revenue: report.totalIncome,
      expenses: report.totalExpenses,
    };
  });
}
