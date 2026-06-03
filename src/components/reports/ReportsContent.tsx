"use client";

import { useMemo, useCallback, useState } from "react";
import * as XLSX from "xlsx";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import { useMonthFilter } from "@/context/MonthFilterContext";
import {
  getMonthlyReportFromTransactions,
  filterTransactionsByMonth,
  type RecentTransaction,
} from "@/lib/data";
import { formatMonthLabel, formatTransactionDate, getCategoryLabel, formatPosNote } from "@/lib/utils";

function formatMoney(amount: number) {
  return amount.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getPrevMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

/* ─── helpers ────────────────────────────────────────────────────────────── */

function safePct(a: number, b: number): string {
  if (b === 0 || !isFinite(b) || !isFinite(a)) return "—";
  const v = ((a - b) / Math.abs(b)) * 100;
  if (!isFinite(v) || isNaN(v)) return "—";
  return (v > 0 ? "+" : "") + v.toFixed(1) + "%";
}

function diffLabel(a: number, b: number): "up" | "down" | "same" {
  if (a > b) return "up";
  if (a < b) return "down";
  return "same";
}

function getIncomeBreakdown(transactions: RecentTransaction[], monthKey: string) {
  const map: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === "income" && t.date?.startsWith(monthKey)) {
      const cat = getCategoryLabel(t.category);
      map[cat] = (map[cat] ?? 0) + t.amount;
    }
  }
  return map;
}

function trendDisplay(
  current: number,
  prev: number,
  hasPrev: boolean,
): { noData: boolean; up: boolean; text: string } {
  if (!hasPrev || prev === 0) return { noData: true, up: false, text: "ไม่มีข้อมูลเดือนก่อน" };
  const pct = ((current - prev) / Math.abs(prev)) * 100;
  if (!isFinite(pct) || isNaN(pct)) return { noData: true, up: false, text: "ไม่มีข้อมูลเดือนก่อน" };
  const up = pct > 0;
  return { noData: false, up, text: `${up ? "+" : ""}${pct.toFixed(1)}% เทียบเดือนก่อน` };
}

/* ─── ReportsContent ─────────────────────────────────────────────────────── */

export function ReportsContent() {
  const { transactions, isLoading, error: loadError } = useTransactions();
  const { selectedMonth } = useMonthFilter();
  const [compareOpen, setCompareOpen] = useState(false);

  const report = useMemo(
    () => getMonthlyReportFromTransactions(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const prevReport = useMemo(
    () => getMonthlyReportFromTransactions(transactions, getPrevMonthKey(selectedMonth)),
    [transactions, selectedMonth]
  );

  const recentTxns = useMemo(
    () => filterTransactionsByMonth(transactions, selectedMonth).slice(0, 10),
    [transactions, selectedMonth]
  );

  /* ── Cash flow forecast (avg of 3 months before selectedMonth) ── */
  const forecast = useMemo(() => {
    const months: string[] = [];
    let [y, m] = selectedMonth.split("-").map(Number);
    for (let i = 0; i < 3; i++) {
      m--; if (m === 0) { m = 12; y--; }
      months.push(`${y}-${String(m).padStart(2, "0")}`);
    }
    const reports = months.map((mo) => getMonthlyReportFromTransactions(transactions, mo));
    const validIncome = reports.filter((r) => r.totalIncome > 0);
    const validExpense = reports.filter((r) => r.totalExpenses > 0);
    const avgIncome = validIncome.length > 0 ? validIncome.reduce((s, r) => s + r.totalIncome, 0) / validIncome.length : 0;
    const avgExpense = validExpense.length > 0 ? validExpense.reduce((s, r) => s + r.totalExpenses, 0) / validExpense.length : 0;
    const [fy, fm] = selectedMonth.split("-").map(Number);
    const nextM = fm === 12 ? 1 : fm + 1;
    const nextY = fm === 12 ? fy + 1 : fy;
    const nextMonth = `${nextY}-${String(nextM).padStart(2, "0")}`;
    return { avgIncome, avgExpense, avgProfit: avgIncome - avgExpense, nextMonth, months: validIncome.length };
  }, [transactions, selectedMonth]);

  /* ── Available months for compare dropdowns ── */
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.date && t.date.length >= 7) set.add(t.date.slice(0, 7));
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const [monthA, setMonthA] = useState<string>(() => selectedMonth);
  const [monthB, setMonthB] = useState<string>(() => getPrevMonthKey(selectedMonth));

  const compareA = useMemo(() => getMonthlyReportFromTransactions(transactions, monthA), [transactions, monthA]);
  const compareB = useMemo(() => getMonthlyReportFromTransactions(transactions, monthB), [transactions, monthB]);
  const incomeBreakA = useMemo(() => getIncomeBreakdown(transactions, monthA), [transactions, monthA]);
  const incomeBreakB = useMemo(() => getIncomeBreakdown(transactions, monthB), [transactions, monthB]);

  const incomeBreak = useMemo(() => getIncomeBreakdown(transactions, selectedMonth), [transactions, selectedMonth]);
  const prevIncomeBreak = useMemo(() => getIncomeBreakdown(transactions, getPrevMonthKey(selectedMonth)), [transactions, selectedMonth]);

  const hasPrevData = prevReport.totalIncome > 0 || prevReport.totalExpenses > 0;

  const noDataA = compareA.totalIncome === 0 && compareA.totalExpenses === 0;
  const noDataB = compareB.totalIncome === 0 && compareB.totalExpenses === 0;

  const { income, expense, profit, margin } = useMemo(() => ({
    income: report.totalIncome,
    expense: report.totalExpenses,
    profit: report.netProfit,
    margin: report.profitMargin,
  }), [report]);

  const growthIncome  = trendDisplay(income,  prevReport.totalIncome,  hasPrevData);
  const growthExpense = trendDisplay(expense, prevReport.totalExpenses, hasPrevData);
  const growthProfit  = trendDisplay(profit,  prevReport.netProfit,    hasPrevData);
  const growthMargin  = trendDisplay(margin,  prevReport.profitMargin, hasPrevData);

  const aiSummary = useMemo(() => {
    const topExpense = report.expenseBreakdown[0];

    const profitText =
      profit > 0
        ? `เดือนนี้มีกำไร ฿${formatMoney(profit)}`
        : profit < 0
        ? `เดือนนี้ขาดทุน ฿${formatMoney(Math.abs(profit))} ควรรีบตรวจรายจ่าย`
        : "รายรับกับรายจ่ายเท่ากันพอดี";

    const marginText =
      margin >= 30
        ? `อัตรากำไร ${margin.toFixed(1)}% อยู่ในระดับดี`
        : margin >= 10
        ? `อัตรากำไร ${margin.toFixed(1)}% พอใช้ แต่ยังควรคุมต้นทุน`
        : income > 0
        ? `อัตรากำไร ${margin.toFixed(1)}% ค่อนข้างต่ำ ควรลดต้นทุน`
        : "ยังไม่มีรายรับเดือนนี้";

    const topExpenseText = topExpense
      ? `ค่าใช้จ่ายสูงสุด: ${topExpense.category} ฿${formatMoney(topExpense.amount)}`
      : "ยังไม่มีข้อมูลค่าใช้จ่าย";

    const advice =
      expense > income
        ? "คำแนะนำ: ลดค่าใช้จ่ายที่ไม่จำเป็น ดูหมวดที่ใช้เงินเยอะที่สุด"
        : "คำแนะนำ: รักษาระดับต้นทุน และเพิ่มยอดขายจากเมนูที่ขายดี";

    return { profitText, marginText, topExpenseText, advice };
  }, [report, income, expense, profit, margin]);

  /* ── Export helpers ─────────────────────────────────────────────────────── */

  const exportCSV = useCallback(() => {
    const rows = [
      ["Report", "Amount"],
      ["Income", income],
      ["Expense", expense],
      ["Profit", profit],
      ["Margin (%)", margin.toFixed(2)],
      [],
      ["AI Summary"],
      [aiSummary.profitText],
      [aiSummary.marginText],
      [aiSummary.topExpenseText],
      [aiSummary.advice],
      [],
      ["Expense Category", "Amount"],
      ...report.expenseBreakdown.map((item) => [item.category, item.amount]),
    ];
    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reports-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [income, expense, profit, margin, aiSummary, report, selectedMonth]);

  const exportExcel = useCallback(() => {
    const summarySheet = [
      ["Report", "Amount"],
      ["Income", income],
      ["Expense", expense],
      ["Profit", profit],
      ["Margin (%)", Number(margin.toFixed(2))],
      [],
      ["AI Summary"],
      [aiSummary.profitText],
      [aiSummary.marginText],
      [aiSummary.topExpenseText],
      [aiSummary.advice],
    ];
    const expenseSheet = [
      ["Expense Category", "Amount"],
      ...report.expenseBreakdown.map((item) => [item.category, item.amount]),
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summarySheet), "Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(expenseSheet), "Expense Breakdown");
    XLSX.writeFile(workbook, `reports-${selectedMonth}.xlsx`);
  }, [income, expense, profit, margin, aiSummary, report, selectedMonth]);

  const exportPDF = useCallback(() => {
    window.print();
  }, []);

  /* ── Loading skeleton ───────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="metric-card rounded-2xl p-7 animate-pulse">
            <div className="h-3 bg-surface-container-highest rounded w-1/3 mb-6" />
            <div className="h-10 bg-surface-container-highest rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  /* ── JSX ────────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {loadError && (
        <div className="sand-card p-4 rounded-xl flex items-center gap-3 border-l-4 border-error">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-on-surface">{loadError}</p>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">
          รายงานกำไรขาดทุน
        </h2>
        <p className="font-body-md text-on-surface-variant">
          สรุปผลประกอบการประจำเดือน {formatMonthLabel(selectedMonth)}
          {!growthIncome.noData && (
            <span className={`ml-2 font-semibold text-sm ${growthIncome.up ? "text-primary" : "text-error"}`}>
              · {growthIncome.text.replace(" เทียบเดือนก่อน", "")} จากเดือนที่แล้ว
            </span>
          )}
        </p>
      </div>

      {/* ── Export PDF — full-width hero button ────────────── */}
      <button
        onClick={exportPDF}
        className="btn-primary w-full py-3.5 text-base print:hidden"
      >
        <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
        บันทึก PDF / พิมพ์รายงาน
      </button>

      {/* ── เปรียบเทียบเดือน ────────────────────────────────── */}
      <div className="metric-card rounded-2xl overflow-hidden print:hidden">
        <button
          onClick={() => setCompareOpen((v) => !v)}
          className="w-full p-6 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary-container text-[20px]">compare_arrows</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">เปรียบเทียบเดือน</h3>
              <p className="font-label-caps text-label-caps text-on-surface-variant">เลือก 2 เดือนเพื่อดูส่วนต่าง</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant">
            {compareOpen ? "expand_less" : "expand_more"}
          </span>
        </button>

        {compareOpen && (
          <div className="px-6 pb-6 space-y-5">
            {/* Dropdowns */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">เดือน A</p>
                <select
                  value={monthA}
                  onChange={(e) => setMonthA(e.target.value)}
                  className="w-full bg-surface-container rounded-xl px-3 py-2.5 font-body-md text-on-surface border border-outline-variant focus:outline-none focus:border-primary text-sm"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>{formatMonthLabel(m)}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => { setMonthA(monthB); setMonthB(monthA); }}
                className="w-9 h-9 mb-0.5 rounded-xl border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-all shrink-0"
                title="สลับเดือน"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">swap_horiz</span>
              </button>
              <div className="flex-1">
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">เดือน B</p>
                <select
                  value={monthB}
                  onChange={(e) => setMonthB(e.target.value)}
                  className="w-full bg-surface-container rounded-xl px-3 py-2.5 font-body-md text-on-surface border border-outline-variant focus:outline-none focus:border-primary text-sm"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>{formatMonthLabel(m)}</option>
                  ))}
                </select>
              </div>
            </div>

            {noDataA && noDataB ? (
              <p className="text-center font-body-md text-on-surface-variant py-6">ไม่มีข้อมูลเปรียบเทียบ</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full table-fixed text-sm min-w-[480px]">
                  <colgroup>
                    <col className="w-[30%]" />
                    <col className="w-[17%]" />
                    <col className="w-[17%]" />
                    <col className="w-[20%]" />
                    <col className="w-[16%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b-2 border-surface-variant">
                      <th className="py-2.5 pr-2 text-left font-label-caps text-label-caps text-on-surface-variant">รายการ</th>
                      <th className="py-2.5 px-1 text-right font-label-caps text-label-caps text-on-surface-variant">
                        {noDataA ? "—" : formatMonthLabel(monthA)}
                      </th>
                      <th className="py-2.5 px-1 text-right font-label-caps text-label-caps text-on-surface-variant">
                        {noDataB ? "—" : formatMonthLabel(monthB)}
                      </th>
                      <th className="py-2.5 px-1 text-right font-label-caps text-label-caps text-on-surface-variant">ส่วนต่าง</th>
                      <th className="py-2.5 pl-1 text-right font-label-caps text-label-caps text-on-surface-variant">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* ── Summary rows ── */}
                    {[
                      { label: "รายรับรวม", a: compareA.totalIncome, b: compareB.totalIncome, isProfit: true },
                      { label: "รายจ่ายรวม", a: compareA.totalExpenses, b: compareB.totalExpenses, isProfit: false },
                      { label: "กำไรสุทธิ", a: compareA.netProfit, b: compareB.netProfit, isProfit: true },
                    ].map(({ label, a, b, isProfit }) => {
                      const diff = a - b;
                      const dir = diffLabel(a, b);
                      const isGood = isProfit ? dir === "up" : dir === "down";
                      return (
                        <tr key={label} className="border-b border-surface-variant">
                          <td className="py-3 pr-2 font-body-md text-on-surface">{label}</td>
                          <td className="py-3 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums">
                            {noDataA ? <span className="text-on-surface-variant text-xs">ไม่มีข้อมูล</span> : `฿${formatMoney(a)}`}
                          </td>
                          <td className="py-3 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums">
                            {noDataB ? <span className="text-on-surface-variant text-xs">ไม่มีข้อมูล</span> : `฿${formatMoney(b)}`}
                          </td>
                          <td className={`py-3 px-1 text-right font-price-table text-price-table tabular-nums ${dir === "same" ? "text-on-surface-variant" : isGood ? "text-primary" : "text-error"}`}>
                            {dir === "same" ? "—" : `${diff > 0 ? "+" : "-"}฿${formatMoney(Math.abs(diff))}`}
                          </td>
                          <td className={`py-3 pl-1 text-right font-label-caps text-label-caps ${dir === "same" ? "text-on-surface-variant" : isGood ? "text-primary" : "text-error"}`}>
                            {dir === "up" ? "▲ " : dir === "down" ? "▼ " : ""}{safePct(a, b)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* อัตรากำไร */}
                    {(() => {
                      const mA = compareA.profitMargin;
                      const mB = compareB.profitMargin;
                      const diff = mA - mB;
                      const dir = diffLabel(mA, mB);
                      return (
                        <tr className="border-b border-surface-variant">
                          <td className="py-3 pr-2 font-body-md text-on-surface">อัตรากำไร</td>
                          <td className="py-3 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums">
                            {noDataA ? <span className="text-on-surface-variant text-xs">ไม่มีข้อมูล</span> : `${mA.toFixed(1)}%`}
                          </td>
                          <td className="py-3 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums">
                            {noDataB ? <span className="text-on-surface-variant text-xs">ไม่มีข้อมูล</span> : `${mB.toFixed(1)}%`}
                          </td>
                          <td className={`py-3 px-1 text-right font-price-table text-price-table tabular-nums ${dir === "same" ? "text-on-surface-variant" : dir === "up" ? "text-primary" : "text-error"}`}>
                            {dir === "same" ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`}
                          </td>
                          <td className="py-3 pl-1 text-right font-label-caps text-label-caps text-on-surface-variant">—</td>
                        </tr>
                      );
                    })()}

                    {/* ── Breakdown รายรับ header ── */}
                    <tr className="bg-surface-container-low">
                      <td colSpan={5} className="py-2 pr-2 font-label-caps text-label-caps text-on-surface-variant pl-1">
                        แยกตามหมวดรายรับ
                      </td>
                    </tr>
                    {["ยอดขายอาหาร", "ยอดขายเครื่องดื่ม", "เดลิเวอรี", "จัดเลี้ยง", "อื่นๆ"]
                      .map((cat) => ({ cat, a: incomeBreakA[cat] ?? 0, b: incomeBreakB[cat] ?? 0 }))
                      .filter(({ a, b }) => a > 0 || b > 0)
                      .map(({ cat, a, b }) => {
                        const diff = a - b;
                        const dir = diffLabel(a, b);
                        return (
                          <tr key={cat} className="border-b border-surface-variant last:border-0">
                            <td className="py-2.5 pr-2 pl-3 font-body-md text-on-surface text-sm">{cat}</td>
                            <td className="py-2.5 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums text-sm">
                              {a > 0 ? `฿${formatMoney(a)}` : "—"}
                            </td>
                            <td className="py-2.5 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums text-sm">
                              {b > 0 ? `฿${formatMoney(b)}` : "—"}
                            </td>
                            <td className={`py-2.5 px-1 text-right font-price-table text-price-table tabular-nums text-sm ${dir === "same" ? "text-on-surface-variant" : dir === "up" ? "text-primary" : "text-error"}`}>
                              {dir === "same" ? "—" : `${diff > 0 ? "+" : "-"}฿${formatMoney(Math.abs(diff))}`}
                            </td>
                            <td className={`py-2.5 pl-1 text-right font-label-caps text-label-caps ${dir === "same" ? "text-on-surface-variant" : dir === "up" ? "text-primary" : "text-error"}`}>
                              {dir === "up" ? "▲ " : dir === "down" ? "▼ " : ""}{safePct(a, b)}
                            </td>
                          </tr>
                        );
                      })}

                    {/* ── Breakdown รายจ่าย header ── */}
                    <tr className="bg-surface-container-low">
                      <td colSpan={5} className="py-2 pr-2 font-label-caps text-label-caps text-on-surface-variant pl-1">
                        แยกตามหมวดรายจ่าย
                      </td>
                    </tr>
                    {["วัตถุดิบ", "ค่าแรง", "ค่าเช่า", "ค่าน้ำค่าไฟ", "การตลาด", "บรรจุภัณฑ์", "อื่นๆ"]
                      .map((cat) => ({
                        cat,
                        a: compareA.expenseBreakdown.find((e) => e.category === cat)?.amount ?? 0,
                        b: compareB.expenseBreakdown.find((e) => e.category === cat)?.amount ?? 0,
                      }))
                      .filter(({ a, b }) => a > 0 || b > 0)
                      .map(({ cat, a, b }) => {
                        const diff = a - b;
                        const dir = diffLabel(a, b);
                        const isGood = dir === "down";
                        return (
                          <tr key={cat} className="border-b border-surface-variant last:border-0">
                            <td className="py-2.5 pr-2 pl-3 font-body-md text-on-surface text-sm">{cat}</td>
                            <td className="py-2.5 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums text-sm">
                              {a > 0 ? `฿${formatMoney(a)}` : "—"}
                            </td>
                            <td className="py-2.5 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums text-sm">
                              {b > 0 ? `฿${formatMoney(b)}` : "—"}
                            </td>
                            <td className={`py-2.5 px-1 text-right font-price-table text-price-table tabular-nums text-sm ${dir === "same" ? "text-on-surface-variant" : isGood ? "text-primary" : "text-error"}`}>
                              {dir === "same" ? "—" : `${diff > 0 ? "+" : "-"}฿${formatMoney(Math.abs(diff))}`}
                            </td>
                            <td className={`py-2.5 pl-1 text-right font-label-caps text-label-caps ${dir === "same" ? "text-on-surface-variant" : isGood ? "text-primary" : "text-error"}`}>
                              {dir === "up" ? "▲ " : dir === "down" ? "▼ " : ""}{safePct(a, b)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Metric cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* รายรับรวม */}
        <div className="metric-card p-7 rounded-2xl">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">รายรับรวม</span>
          <div className="flex items-baseline gap-2 text-primary">
            <span className="text-2xl font-bold opacity-60">฿</span>
            <span className="font-display-currency text-display-currency tracking-tight leading-none">
              {formatMoney(income)}
            </span>
          </div>
          {growthIncome.noData ? (
            <p className="mt-3 font-label-caps text-label-caps text-on-surface-variant">ไม่มีข้อมูลเดือนก่อน</p>
          ) : (
            <div className={`mt-3 flex items-center gap-1.5 ${growthIncome.up ? "text-primary" : "text-error"}`}>
              <span className="material-symbols-outlined text-[16px]">
                {growthIncome.up ? "trending_up" : "trending_down"}
              </span>
              <span className="font-label-caps text-label-caps">{growthIncome.text}</span>
            </div>
          )}
        </div>

        {/* รายจ่ายรวม */}
        <div className="metric-card p-7 rounded-2xl">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">รายจ่ายรวม</span>
          <div className="flex items-baseline gap-2 text-error">
            <span className="text-2xl font-bold opacity-60">฿</span>
            <span className="font-display-currency text-display-currency tracking-tight leading-none">
              {formatMoney(expense)}
            </span>
          </div>
          {growthExpense.noData ? (
            <p className="mt-3 font-label-caps text-label-caps text-on-surface-variant">ไม่มีข้อมูลเดือนก่อน</p>
          ) : (
            <div className={`mt-3 flex items-center gap-1.5 ${growthExpense.up ? "text-error" : "text-primary"}`}>
              <span className="material-symbols-outlined text-[16px]">
                {growthExpense.up ? "trending_up" : "trending_down"}
              </span>
              <span className="font-label-caps text-label-caps">{growthExpense.text}</span>
            </div>
          )}
        </div>

        {/* กำไรสุทธิ — HERO CARD (dark green) */}
        <div className={`p-7 rounded-2xl md:col-span-2 ${profit >= 0 ? "card-hero" : "metric-card"}`}>
          <span className={`font-label-caps text-label-caps block mb-3 ${profit >= 0 ? "text-green-200" : "text-on-surface-variant"}`}>
            กำไรสุทธิ
          </span>
          <div className={`flex items-baseline gap-2 ${profit >= 0 ? "text-white" : "text-error"}`}>
            <span className="text-2xl font-bold opacity-70">฿</span>
            <span className="font-display-currency text-display-currency tracking-tight leading-none">
              {formatMoney(Math.abs(profit))}
            </span>
          </div>
          <div className={`mt-3 flex items-center gap-2 ${profit >= 0 ? "text-green-200" : "text-error"}`}>
            <span className="material-symbols-outlined text-[16px]">
              {profit >= 0 ? "check_circle" : "cancel"}
            </span>
            <span className="font-label-caps text-label-caps">
              {profit >= 0 ? `อัตรากำไร ${margin.toFixed(1)}%` : "ขาดทุน"}
            </span>
          </div>
          {growthProfit.noData ? (
            <p className="mt-2 font-label-caps text-label-caps opacity-60" style={{ color: profit >= 0 ? "#bbf7d0" : undefined }}>ไม่มีข้อมูลเดือนก่อน</p>
          ) : (
            <div className={`mt-2 flex items-center gap-1.5 ${growthProfit.up ? "text-green-200" : "text-red-300"}`}>
              <span className="material-symbols-outlined text-[14px]">
                {growthProfit.up ? "trending_up" : "trending_down"}
              </span>
              <span className="font-label-caps text-label-caps text-xs">{growthProfit.text}</span>
            </div>
          )}
          {!growthMargin.noData && (
            <div className={`mt-1 flex items-center gap-1 ${growthMargin.up ? "text-green-200" : "text-red-300"}`}>
              <span className="font-label-caps text-xs opacity-80">อัตรากำไร {growthMargin.text}</span>
            </div>
          )}
        </div>

      </div>

      {/* ── วิเคราะห์โครงสร้างต้นทุน ──────────────────────── */}
      <div className="metric-card p-7 rounded-2xl">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-5">
          วิเคราะห์โครงสร้างต้นทุน
        </h3>
        <div className="space-y-4">
          <ProgressRow label="รายรับ" amount={income} total={income} colorClass="bg-primary" />
          <ProgressRow label="รายจ่าย" amount={expense} total={income} colorClass="bg-error" />
          <ProgressRow label="กำไรสุทธิ" amount={Math.max(profit, 0)} total={income} colorClass="bg-primary-container" />
        </div>
      </div>

      {/* ── AI Summary ─────────────────────────────────────── */}
      <div className="metric-card p-7 rounded-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-container text-[20px]">auto_awesome</span>
          </div>
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">วิเคราะห์อัตโนมัติ</h3>
            <p className="font-label-caps text-label-caps text-on-surface-variant">วิเคราะห์จากเกณฑ์ข้อมูล</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { icon: "trending_up", text: aiSummary.profitText },
            { icon: "pie_chart", text: aiSummary.marginText },
            { icon: "receipt_long", text: aiSummary.topExpenseText },
            { icon: "lightbulb", text: aiSummary.advice },
          ].map(({ icon, text }) => (
            <div key={icon} className="flex items-start gap-3 p-4 bg-surface-container-low rounded-xl">
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">{icon}</span>
              <p className="font-body-md text-on-surface">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── รายรับแยกตามหมวดหมู่ ───────────────────────────── */}
      {Object.keys(incomeBreak).length > 0 && (
        <div className="metric-card rounded-2xl overflow-hidden">
          <div className="p-7 pb-0">
            <h3 className="font-headline-md text-headline-md text-on-surface">รายรับแยกตามหมวดหมู่</h3>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-variant text-left">
                  <th className="px-8 py-4 font-label-caps text-label-caps text-on-surface-variant">หมวดหมู่</th>
                  <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">สัดส่วน</th>
                  <th className="px-8 py-4 font-label-caps text-label-caps text-on-surface-variant text-right">จำนวนเงิน</th>
                  <th className="px-4 py-4 font-label-caps text-label-caps text-on-surface-variant text-right">%</th>
                  <th className="px-8 py-4 font-label-caps text-label-caps text-on-surface-variant text-right">เดือนก่อน</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(incomeBreak)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => {
                    const pct = income > 0 ? (amount / income) * 100 : 0;
                    const prevAmt = prevIncomeBreak[category] ?? 0;
                    const tr = trendDisplay(amount, prevAmt, hasPrevData);
                    return (
                      <tr key={category} className="border-b border-surface-variant last:border-0 hover:bg-surface-container-low transition-colors">
                        <td className="px-8 py-4 font-body-md text-on-surface">{getCategoryLabel(category)}</td>
                        <td className="px-6 py-4 min-w-[120px]">
                          <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right font-price-table text-price-table text-on-surface">
                          ฿{formatMoney(amount)}
                        </td>
                        <td className="px-4 py-4 text-right font-label-caps text-label-caps text-on-surface-variant">
                          {pct.toFixed(1)}%
                        </td>
                        <td className="px-8 py-4 text-right font-label-caps text-label-caps">
                          {tr.noData ? (
                            <span className="text-on-surface-variant">—</span>
                          ) : (
                            <span className={tr.up ? "text-primary" : "text-error"}>
                              {tr.up ? "▲" : "▼"} {tr.text.split("%")[0]}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── รายจ่ายแยกตามหมวดหมู่ ──────────────────────────── */}
      <div className="metric-card rounded-2xl overflow-hidden">
        <div className="p-7 pb-0 flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface">
            รายจ่ายแยกตามหมวดหมู่
          </h3>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant font-label-caps text-label-caps text-on-surface-variant hover:bg-surface-container transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              CSV
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary font-label-caps text-label-caps text-primary hover:bg-primary-container/20 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">table_view</span>
              Excel
            </button>
          </div>
        </div>
        {report.expenseBreakdown.length === 0 ? (
          <p className="px-8 py-10 font-body-md text-on-surface-variant text-center">
            ยังไม่มีข้อมูลค่าใช้จ่ายในเดือนนี้
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-variant text-left">
                  <th className="px-8 py-4 font-label-caps text-label-caps text-on-surface-variant">หมวดหมู่</th>
                  <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">สัดส่วน</th>
                  <th className="px-8 py-4 font-label-caps text-label-caps text-on-surface-variant text-right">จำนวนเงิน</th>
                  <th className="px-4 py-4 font-label-caps text-label-caps text-on-surface-variant text-right">%</th>
                  <th className="px-8 py-4 font-label-caps text-label-caps text-on-surface-variant text-right">เดือนก่อน</th>
                </tr>
              </thead>
              <tbody>
                {report.expenseBreakdown.map(({ category, amount }) => {
                  const pct = expense > 0 ? (amount / expense) * 100 : 0;
                  const prevAmt = prevReport.expenseBreakdown.find((e) => e.category === category)?.amount ?? 0;
                  const tr = trendDisplay(amount, prevAmt, hasPrevData);
                  return (
                    <tr key={category} className="border-b border-surface-variant last:border-0 hover:bg-surface-container-low transition-colors">
                      <td className="px-8 py-4 font-body-md text-on-surface">{getCategoryLabel(category)}</td>
                      <td className="px-6 py-4 min-w-[120px]">
                        <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right font-price-table text-price-table text-on-surface">
                        ฿{formatMoney(amount)}
                      </td>
                      <td className="px-4 py-4 text-right font-label-caps text-label-caps text-on-surface-variant">
                        {pct.toFixed(1)}%
                      </td>
                      <td className="px-8 py-4 text-right font-label-caps text-label-caps">
                        {tr.noData ? (
                          <span className="text-on-surface-variant">—</span>
                        ) : (
                          <span className={tr.up ? "text-error" : "text-primary"}>
                            {tr.up ? "▲" : "▼"} {tr.text.split("%")[0]}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── รายการล่าสุด ────────────────────────────────────── */}
      <div className="metric-card rounded-2xl overflow-hidden">
        <div className="p-7 pb-0">
          <h3 className="font-headline-md text-headline-md text-on-surface">รายการล่าสุด</h3>
          <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">
            {formatMonthLabel(selectedMonth)} — 10 รายการล่าสุด
          </p>
        </div>
        {recentTxns.length === 0 ? (
          <p className="px-7 py-10 font-body-md text-on-surface-variant text-center">
            ยังไม่มีรายการในเดือนนี้
          </p>
        ) : (
          <div className="mt-5 divide-y divide-surface-container-low">
            {recentTxns.map((tx) => (
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
                  <p className="font-body-md text-on-surface truncate">
                    {tx.description && (tx.description.startsWith("POS_IMPORT_") || tx.description.startsWith("POS Import:"))
                      ? formatPosNote(tx.description, tx.category)
                      : (tx.description || getCategoryLabel(tx.category))}
                  </p>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">{getCategoryLabel(tx.category)} · {formatTransactionDate(tx.date)}</p>
                </div>
                <div className={`font-price-table text-price-table shrink-0 ${
                  tx.type === "income" ? "text-primary" : "text-error"
                }`}>
                  {tx.type === "income" ? "+" : "-"}฿{formatMoney(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Cash Flow Forecast ─────────────────────────────── */}
      {forecast.avgIncome > 0 && (
        <div className="metric-card p-7 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary-container text-[20px]">trending_up</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">พยากรณ์เดือนหน้า</h3>
              <p className="font-label-caps text-label-caps text-on-surface-variant">
                คำนวณจากค่าเฉลี่ย {forecast.months} เดือนย้อนหลัง
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-container rounded-xl p-4">
              <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">รายรับคาดการณ์</p>
              <p className="font-price-table text-price-table text-primary">฿{formatMoney(Math.round(forecast.avgIncome))}</p>
            </div>
            <div className="bg-surface-container rounded-xl p-4">
              <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">รายจ่ายคาดการณ์</p>
              <p className="font-price-table text-price-table text-error">฿{formatMoney(Math.round(forecast.avgExpense))}</p>
            </div>
            <div className={`rounded-xl p-4 ${forecast.avgProfit >= 0 ? "bg-primary-container" : "bg-error-container"}`}>
              <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">กำไรคาดการณ์</p>
              <p className={`font-price-table text-price-table ${forecast.avgProfit >= 0 ? "text-on-primary-container" : "text-error"}`}>
                {forecast.avgProfit >= 0 ? "+" : ""}฿{formatMoney(Math.round(forecast.avgProfit))}
              </p>
            </div>
          </div>
          {forecast.avgProfit < 0 && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-error-container rounded-xl">
              <span className="material-symbols-outlined text-error text-[18px]">warning</span>
              <p className="font-body-sm text-on-error-container">แนวโน้มขาดทุน — ควรเร่งหาทางเพิ่มรายรับหรือลดต้นทุน</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

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
        <div className="flex items-center gap-2">
          <span className="font-label-caps text-label-caps text-on-surface-variant">{pct.toFixed(1)}%</span>
          <span className="font-price-table text-price-table text-on-surface-variant">
            ฿{amount.toLocaleString("th-TH")}
          </span>
        </div>
      </div>
      <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
