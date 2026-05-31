"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { fetchTransactions } from "@/lib/supabase/transactions";
import { MonthlySummaryChart } from "@/components/charts/MonthlySummaryChart";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  note?: string | null;
  date: string;
};

function formatMoney(amount: number) {
  return amount.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/* ─── ReportsContent ─────────────────────────────────────────────────────── */

export function ReportsContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTransactions() {
      try {
        const data = await fetchTransactions();
        setTransactions(data as Transaction[]);
        setLoadError(null);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ");
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

    return { topExpenseText, profitText, marginText, advice };
  }, [summary, expenseByCategory]);

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
    const blob = new Blob(["﻿" + csvContent], {
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
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summarySheet), "Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(expenseSheet), "Expense Breakdown");
    XLSX.writeFile(workbook, "reports-summary.xlsx");
  }

  /* ══ Loading ══ */
  if (loading) {
    return (
      <div className="space-y-stack-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="metric-card rounded-2xl border border-surface-variant p-8 animate-pulse"
            >
              <div className="h-3 bg-surface-container-highest rounded w-1/3 mb-6" />
              <div className="h-8 bg-surface-container-highest rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ══ JSX ══ */
  return (
    <div className="space-y-stack-md">

      {loadError && (
        <div className="sand-card p-4 rounded-xl flex items-center gap-3 border-l-4 border-error">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-on-surface">{loadError}</p>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">
            รายงานกำไร-ขาดทุน
          </h2>
          <p className="font-body-md text-on-surface-variant">
            สรุปรายรับ รายจ่าย กำไร และคำแนะนำ
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant font-body-md text-on-surface-variant hover:bg-surface-container transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            CSV
          </button>

          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary font-body-md text-primary hover:bg-primary-container/20 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">table_view</span>
            Excel
          </button>
        </div>
      </section>

      {/* ── Metric cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
        {/* รายรับ */}
        <div className="metric-card p-6 rounded-2xl border border-surface-variant">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">
            รายรับรวม
          </span>
          <div className="flex items-baseline gap-1.5 text-primary">
            <span className="text-lg font-bold opacity-70">฿</span>
            <span className="text-2xl font-bold font-headline-md">
              {formatMoney(summary.income)}
            </span>
          </div>
        </div>

        {/* รายจ่าย */}
        <div className="metric-card p-6 rounded-2xl border border-surface-variant">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">
            รายจ่ายรวม
          </span>
          <div className="flex items-baseline gap-1.5 text-error">
            <span className="text-lg font-bold opacity-70">฿</span>
            <span className="text-2xl font-bold font-headline-md">
              {formatMoney(summary.expense)}
            </span>
          </div>
        </div>

        {/* กำไร */}
        <div className="metric-card p-6 rounded-2xl border border-surface-variant">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">
            กำไรสุทธิ
          </span>
          <div
            className={`flex items-baseline gap-1.5 ${summary.profit >= 0 ? "text-primary" : "text-error"}`}
          >
            <span className="text-lg font-bold opacity-70">฿</span>
            <span className="text-2xl font-bold font-headline-md">
              {formatMoney(Math.abs(summary.profit))}
            </span>
          </div>
          {summary.profit < 0 && (
            <p className="mt-1 font-label-caps text-label-caps text-error">ขาดทุน</p>
          )}
        </div>

        {/* อัตรากำไร */}
        <div className="metric-card p-6 rounded-2xl border border-surface-variant">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">
            อัตรากำไร
          </span>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold font-headline-md text-on-surface">
              {summary.margin.toFixed(1)}%
            </span>
            <div className="h-2 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(Math.max(summary.margin, 0), 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Financial Summary chart ─────────────────────────── */}
      <section className="metric-card p-8 rounded-2xl border border-surface-variant">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-headline-md text-headline-md text-on-surface">
            สรุปการเงิน
          </h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="font-label-caps text-label-caps text-on-surface-variant">รายรับ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-error" />
              <span className="font-label-caps text-label-caps text-on-surface-variant">รายจ่าย</span>
            </div>
          </div>
        </div>

        {/* Progress rows */}
        <div className="space-y-5 mb-8">
          <ProgressRow
            label="รายรับ"
            amount={summary.income}
            total={summary.income}
            colorClass="bg-primary"
          />
          <ProgressRow
            label="รายจ่าย"
            amount={summary.expense}
            total={summary.income}
            colorClass="bg-error"
          />
          <ProgressRow
            label="กำไรสุทธิ"
            amount={Math.max(summary.profit, 0)}
            total={summary.income}
            colorClass="bg-primary-container"
          />
        </div>

        {/* Chart */}
        <MonthlySummaryChart income={summary.income} expenses={summary.expense} />
      </section>

      {/* ── AI Summary ─────────────────────────────────────── */}
      <section className="metric-card p-8 rounded-2xl border border-surface-variant">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-container text-[20px]">
              auto_awesome
            </span>
          </div>
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              วิเคราะห์อัตโนมัติ
            </h3>
            <p className="font-label-caps text-label-caps text-on-surface-variant">
              Rule-based analysis
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { icon: "trending_up", text: aiSummary.profitText },
            { icon: "pie_chart", text: aiSummary.marginText },
            { icon: "receipt_long", text: aiSummary.topExpenseText },
            { icon: "lightbulb", text: aiSummary.advice },
          ].map(({ icon, text }) => (
            <div
              key={icon}
              className="flex items-start gap-3 p-4 bg-surface-container-low rounded-xl"
            >
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
                {icon}
              </span>
              <p className="font-body-md text-on-surface">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Expense Breakdown table ─────────────────────────── */}
      <section className="metric-card rounded-2xl border border-surface-variant overflow-hidden">
        <div className="p-8 pb-0">
          <h3 className="font-headline-md text-headline-md text-on-surface">
            รายจ่ายแยกตามหมวดหมู่
          </h3>
        </div>

        {expenseByCategory.length === 0 ? (
          <p className="px-8 py-10 font-body-md text-on-surface-variant text-center">
            ยังไม่มีข้อมูลค่าใช้จ่าย
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-variant text-left">
                  <th className="px-8 py-4 font-label-caps text-label-caps text-on-surface-variant">
                    หมวดหมู่
                  </th>
                  <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">
                    สัดส่วน
                  </th>
                  <th className="px-8 py-4 font-label-caps text-label-caps text-on-surface-variant text-right">
                    จำนวนเงิน
                  </th>
                  <th className="px-8 py-4 font-label-caps text-label-caps text-on-surface-variant text-right">
                    เปอร์เซ็นต์
                  </th>
                </tr>
              </thead>

              <tbody>
                {expenseByCategory.map(({ category, amount }) => {
                  const pct =
                    summary.expense > 0 ? (amount / summary.expense) * 100 : 0;

                  return (
                    <tr
                      key={category}
                      className="border-b border-surface-variant last:border-0 hover:bg-surface-container-low transition-colors"
                    >
                      <td className="px-8 py-4 font-body-md text-on-surface">
                        {category}
                      </td>
                      <td className="px-6 py-4 min-w-[140px]">
                        <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                          <div
                            className="h-full bg-error transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right font-price-table text-price-table text-error">
                        ฿{formatMoney(amount)}
                      </td>
                      <td className="px-8 py-4 text-right font-label-caps text-label-caps text-on-surface-variant">
                        {pct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── ProgressRow helper ──────────────────────────────────────────────────── */

function ProgressRow({
  label,
  amount,
  total,
  colorClass,
}: {
  label: string;
  amount: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.min((amount / total) * 100, 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-body-md text-on-surface">{label}</span>
        <span className="font-price-table text-price-table text-on-surface-variant">
          ฿{amount.toLocaleString("th-TH")}
        </span>
      </div>
      <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
