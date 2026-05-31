"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { fetchTransactions } from "@/lib/supabase/transactions";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  note?: string | null;
  date: string;
};

export function ReportsContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTransactions() {
      try {
        const data = await fetchTransactions();
        setTransactions(data as Transaction[]);
      } catch (error) {
        console.error("Load reports error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, []);

  const summary = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const expense = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const profit = income - expense;
    const margin = income > 0 ? (profit / income) * 100 : 0;

    return { income, expense, profit, margin };
  }, [transactions]);

  const expenseByCategory = useMemo(() => {
    const result: Record<string, number> = {};

    transactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        result[item.category] =
          (result[item.category] || 0) + Number(item.amount);
      });

    return Object.entries(result)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const aiSummary = useMemo(() => {
    const topExpense = expenseByCategory[0];

    let profitText = "";
    if (summary.profit > 0) {
      profitText = `ร้านมีกำไร ฿${formatMoney(summary.profit)} ถือว่ายังบริหารได้ดี`;
    } else if (summary.profit < 0) {
      profitText = `ร้านขาดทุน ฿${formatMoney(Math.abs(summary.profit))} ควรรีบตรวจรายจ่าย`;
    } else {
      profitText = "ร้านยังไม่มีกำไรหรือขาดทุน รายรับกับรายจ่ายเท่ากัน";
    }

    let marginText = "";
    if (summary.margin >= 30) {
      marginText = `อัตรากำไร ${summary.margin.toFixed(2)}% อยู่ในระดับดี`;
    } else if (summary.margin >= 10) {
      marginText = `อัตรากำไร ${summary.margin.toFixed(2)}% พอใช้ แต่ยังควรคุมต้นทุน`;
    } else if (summary.income > 0) {
      marginText = `อัตรากำไร ${summary.margin.toFixed(2)}% ค่อนข้างต่ำ ควรลดต้นทุนหรือเพิ่มยอดขาย`;
    } else {
      marginText = "ยังไม่มีรายรับ จึงยังวิเคราะห์ Margin ไม่ได้";
    }

    const topExpenseText = topExpense
      ? `หมวดค่าใช้จ่ายสูงสุดคือ ${topExpense.category} จำนวน ฿${formatMoney(topExpense.amount)}`
      : "ยังไม่มีข้อมูลค่าใช้จ่าย";

    const advice =
      summary.expense > summary.income
        ? "คำแนะนำ: ลดค่าใช้จ่ายที่ไม่จำเป็นก่อน แล้วดูหมวดที่ใช้เงินเยอะที่สุด"
        : "คำแนะนำ: รักษาระดับต้นทุน และเพิ่มยอดขายจากเมนูหรือช่วงเวลาที่ขายดี";

    return {
      topExpenseText,
      profitText,
      marginText,
      advice,
    };
  }, [summary, expenseByCategory]);

  function formatMoney(amount: number) {
    return amount.toLocaleString("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  function exportCSV() {
    const rows = [
      ["Report", "Amount"],
      ["Income", summary.income],
      ["Expense", summary.expense],
      ["Profit", summary.profit],
      ["Margin (%)", summary.margin.toFixed(2)],
      [],
      ["AI Summary"],
      [aiSummary.topExpenseText],
      [aiSummary.profitText],
      [aiSummary.marginText],
      [aiSummary.advice],
      [],
      ["Expense Category", "Amount"],
      ...expenseByCategory.map((item) => [item.category, item.amount]),
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reports-summary.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const summarySheet = [
      ["Report", "Amount"],
      ["Income", summary.income],
      ["Expense", summary.expense],
      ["Profit", summary.profit],
      ["Margin (%)", Number(summary.margin.toFixed(2))],
      [],
      ["AI Summary"],
      [aiSummary.topExpenseText],
      [aiSummary.profitText],
      [aiSummary.marginText],
      [aiSummary.advice],
    ];

    const expenseSheet = [
      ["Expense Category", "Amount"],
      ...expenseByCategory.map((item) => [item.category, item.amount]),
    ];

    const workbook = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.aoa_to_sheet(summarySheet);
    const wsExpense = XLSX.utils.aoa_to_sheet(expenseSheet);

    XLSX.utils.book_append_sheet(workbook, wsSummary, "Summary");
    XLSX.utils.book_append_sheet(workbook, wsExpense, "Expense Breakdown");

    XLSX.writeFile(workbook, "reports-summary.xlsx");
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">
            สรุปรายรับ รายจ่าย กำไร และคำแนะนำจาก AI
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </button>

          <button
            onClick={exportExcel}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Export Excel
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Income" value={`฿${formatMoney(summary.income)}`} color="text-green-600" />
        <SummaryCard label="Expense" value={`฿${formatMoney(summary.expense)}`} color="text-red-600" />
        <SummaryCard label="Profit" value={`฿${formatMoney(summary.profit)}`} color="text-blue-600" />
        <SummaryCard label="Margin" value={`${summary.margin.toFixed(2)}%`} color="text-blue-600" />
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">AI Summary V2</h2>

        <div className="mt-4 space-y-3 text-sm text-gray-700">
          <p>• {aiSummary.topExpenseText}</p>
          <p>• {aiSummary.profitText}</p>
          <p>• {aiSummary.marginText}</p>
          <p>• {aiSummary.advice}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Financial Summary
        </h2>

        <div className="mt-5 space-y-4">
          <ProgressRow label="Income" amount={summary.income} total={summary.income} color="bg-green-500" />
          <ProgressRow label="Expense" amount={summary.expense} total={summary.income} color="bg-red-500" />
          <ProgressRow label="Profit" amount={summary.profit} total={summary.income} color="bg-blue-500" />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Expense Breakdown
        </h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-3 font-medium text-gray-600">Category</th>
                <th className="p-3 text-right font-medium text-gray-600">Amount</th>
                <th className="p-3 text-right font-medium text-gray-600">Percent</th>
              </tr>
            </thead>

            <tbody>
              {expenseByCategory.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-500">
                    ยังไม่มีข้อมูลค่าใช้จ่าย
                  </td>
                </tr>
              ) : (
                expenseByCategory.map((item) => {
                  const percent =
                    summary.expense > 0 ? (item.amount / summary.expense) * 100 : 0;

                  return (
                    <tr key={item.category} className="border-b">
                      <td className="p-3 text-gray-800">{item.category}</td>
                      <td className="p-3 text-right text-gray-800">
                        ฿{formatMoney(item.amount)}
                      </td>
                      <td className="p-3 text-right text-gray-800">
                        {percent.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ProgressRow({
  label,
  amount,
  total,
  color,
}: {
  label: string;
  amount: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? Math.min((amount / total) * 100, 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">฿{amount.toLocaleString("th-TH")}</span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}