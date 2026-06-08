"use client";

import { useMemo, useCallback, useState } from "react";
import Link from "next/link";
import { useRestaurantName } from "@/lib/restaurantSettings";
import * as XLSX from "xlsx";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import { useMonthFilter } from "@/context/MonthFilterContext";
import {
  getMonthlyReportFromTransactions,
  filterTransactionsByMonth,
  type RecentTransaction,
} from "@/lib/data";
import { formatMonthLabel, getCategoryLabel } from "@/lib/utils";

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

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
  const [restaurantName] = useRestaurantName();
  const [compareOpen, setCompareOpen] = useState(false);
  const [yearlyOpen, setYearlyOpen] = useState(false);
  const selectedYear = selectedMonth.slice(0, 4);

  /* ── Yearly data ── */
  const yearlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
      const r = getMonthlyReportFromTransactions(transactions, monthKey);
      return { monthKey, label: THAI_MONTHS[i], income: r.totalIncome, expense: r.totalExpenses, profit: r.netProfit };
    });
  }, [transactions, selectedYear]);

  const yearlyTotals = useMemo(() => ({
    income: yearlyData.reduce((s, d) => s + d.income, 0),
    expense: yearlyData.reduce((s, d) => s + d.expense, 0),
    profit: yearlyData.reduce((s, d) => s + d.profit, 0),
  }), [yearlyData]);

  const yearlyMaxIncome = useMemo(() => Math.max(...yearlyData.map(d => d.income), 1), [yearlyData]);

  const report = useMemo(
    () => getMonthlyReportFromTransactions(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const prevReport = useMemo(
    () => getMonthlyReportFromTransactions(transactions, getPrevMonthKey(selectedMonth)),
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

  /* ── Export สรุปนักบัญชี (Excel ครบวงจร) ── */
  const exportAccountant = useCallback(() => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: สรุปรายเดือน
    const summaryRows = [
      ["สรุปรายงานการเงิน", `${formatMonthLabel(selectedMonth)}`],
      [],
      ["รายการ", "จำนวนเงิน (บาท)"],
      ["รายรับรวม", income],
      ["รายจ่ายรวม", expense],
      ["กำไรสุทธิ", profit],
      ["อัตรากำไร (%)", Number(margin.toFixed(2))],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "สรุปเดือนนี้");

    // Sheet 2: รายจ่ายแยกหมวด
    const expRows = [
      ["หมวดหมู่", "จำนวนเงิน (บาท)", "สัดส่วน (%)"],
      ...report.expenseBreakdown.map(e => [
        e.category,
        e.amount,
        expense > 0 ? Number(((e.amount / expense) * 100).toFixed(2)) : 0,
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expRows), "รายจ่ายแยกหมวด");

    // Sheet 3: รายการทั้งหมดในเดือน
    const monthTxns = filterTransactionsByMonth(transactions, selectedMonth);
    const txRows = [
      ["วันที่", "ประเภท", "หมวดหมู่", "จำนวนเงิน (บาท)", "หมายเหตุ"],
      ...monthTxns.map(t => [
        t.date,
        t.type === "income" ? "รายรับ" : "รายจ่าย",
        getCategoryLabel(t.category),
        t.amount,
        t.description ?? "",
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(txRows), "รายการทั้งหมด");

    // Sheet 4: ภาพรวมรายปี
    const yrRows = [
      ["เดือน", "รายรับ", "รายจ่าย", "กำไรสุทธิ"],
      ...yearlyData.map(d => [d.label, d.income, d.expense, d.profit]),
      [],
      ["รวมทั้งปี", yearlyTotals.income, yearlyTotals.expense, yearlyTotals.profit],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(yrRows), `ภาพรวมปี ${selectedYear}`);

    XLSX.writeFile(wb, `รายงานการเงิน-${selectedMonth}.xlsx`);
  }, [income, expense, profit, margin, report, transactions, selectedMonth, yearlyData, yearlyTotals, selectedYear]);

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
  const monthTxns = filterTransactionsByMonth(transactions, selectedMonth).slice(0, 50);
  const printDate = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
    <div className="space-y-4 web-only">

      {loadError && (
        <div className="sand-card p-4 rounded-xl flex items-center gap-3 border-l-4 border-error">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-on-surface">{loadError}</p>
        </div>
      )}

      {!loadError && report.totalIncome === 0 && report.totalExpenses === 0 && (
        <div className="metric-card rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[40px]">bar_chart</span>
          <div>
            <p className="font-headline-md text-headline-md text-on-surface mb-1">ยังไม่มีข้อมูลเพียงพอสำหรับสร้างรายงาน</p>
            <p className="font-body-md text-on-surface-variant">บันทึกรายรับ–รายจ่ายก่อน แล้วรายงานจะปรากฏที่นี่</p>
          </div>
          <Link href="/income/new" className="btn-primary px-6 py-2.5 text-sm">
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            เพิ่มข้อมูลแรก
          </Link>
        </div>
      )}

      {/* ── Header + Export buttons (desktop right) ─────────── */}
      <div className="page-header-card rounded-2xl px-5 py-4 flex items-center gap-4" style={{ borderLeftColor: "#115637" }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#115637 0%,#1a7a4e 100%)" }}>
          <span className="material-symbols-outlined text-white text-[22px]">leaderboard</span>
        </div>
        <div className="flex-1">
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#115637", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "2px" }}>{restaurantName}</p>
          <h2 style={{ fontFamily: "var(--font-manrope)", fontSize: "20px", fontWeight: 800, color: "#1b1c19", lineHeight: 1.2 }}>
            รายงานกำไรขาดทุน
          </h2>
          <p style={{ fontSize: "12px", marginTop: "2px" }}>
            <span style={{ color: "#707972" }}>สรุปผลประกอบการ {formatMonthLabel(selectedMonth)}</span>
            {!growthIncome.noData && (
              <span style={{ marginLeft: "6px", fontWeight: 700, color: growthIncome.up ? "#115637" : "#ba1a1a" }}>
                · {growthIncome.text.replace(" เทียบเดือนก่อน", "")} จากเดือนที่แล้ว
              </span>
            )}
          </p>
        </div>
        {/* Export buttons — desktop only */}
        <div className="hidden md:flex flex-col gap-2 shrink-0 print:hidden">
          <button onClick={exportAccountant} className="btn-primary px-4 py-2 text-sm">
            <span className="material-symbols-outlined text-[16px]">table_view</span>
            Export (.xlsx)
          </button>
          <button onClick={exportPDF} className="btn-secondary px-4 py-2 text-sm">
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            ส่งออก PDF
          </button>
        </div>
      </div>

      {/* ── KPI Summary ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* รายรับรวม */}
        <div className="kpi-card p-7 rounded-2xl">
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
        <div className="kpi-card p-7 rounded-2xl" style={{ borderTopColor: "#ba1a1a" }}>
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

        {/* กำไรสุทธิ — full width */}
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
            <div className={`rounded-xl p-4 ${forecast.avgProfit >= 0 ? "bg-primary" : "bg-error"}`}>
              <p className="font-label-caps text-label-caps text-white/80 mb-1">กำไรคาดการณ์</p>
              <p className="font-price-table text-price-table text-white">
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

      {/* ── รายรับแยกตามหมวดหมู่ ───────────────────────────── */}
      {Object.keys(incomeBreak).length > 0 && (
        <div className="metric-card rounded-2xl overflow-hidden">
          <div className="p-7 pb-0">
            <h3 className="font-headline-md text-headline-md text-on-surface">รายรับแยกตามหมวดหมู่</h3>
          </div>
          {/* Mobile compact list */}
          <div className="md:hidden mt-4 px-5 pb-5 space-y-4">
            {Object.entries(incomeBreak).sort((a, b) => b[1] - a[1]).map(([category, amount]) => {
              const pct = income > 0 ? (amount / income) * 100 : 0;
              const prevAmt = prevIncomeBreak[category] ?? 0;
              const tr = trendDisplay(amount, prevAmt, hasPrevData);
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-body-md text-on-surface text-sm">{getCategoryLabel(category)}</p>
                    <p className="font-price-table text-price-table text-on-surface text-sm">฿{formatMoney(amount)}</p>
                  </div>
                  <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant text-xs">{pct.toFixed(1)}%</span>
                    {tr.noData ? (
                      <span className="font-label-caps text-label-caps text-on-surface-variant text-xs">—</span>
                    ) : (
                      <span className={`font-label-caps text-label-caps text-xs ${tr.up ? "text-primary" : "text-error"}`}>
                        {tr.up ? "▲" : "▼"} {tr.text.split("%")[0]}% จากเดือนก่อน
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block mt-6 overflow-x-auto">
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
          <>
          {/* Mobile compact list */}
          <div className="md:hidden mt-4 px-5 pb-5 space-y-4">
            {report.expenseBreakdown.map(({ category, amount }) => {
              const pct = expense > 0 ? (amount / expense) * 100 : 0;
              const prevAmt = prevReport.expenseBreakdown.find((e) => e.category === category)?.amount ?? 0;
              const tr = trendDisplay(amount, prevAmt, hasPrevData);
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-body-md text-on-surface text-sm">{getCategoryLabel(category)}</p>
                    <p className="font-price-table text-price-table text-error text-sm">฿{formatMoney(amount)}</p>
                  </div>
                  <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-error transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant text-xs">{pct.toFixed(1)}%</span>
                    {tr.noData ? (
                      <span className="font-label-caps text-label-caps text-on-surface-variant text-xs">—</span>
                    ) : (
                      <span className={`font-label-caps text-label-caps text-xs ${tr.up ? "text-error" : "text-primary"}`}>
                        {tr.up ? "▲" : "▼"} {tr.text.split("%")[0]}% จากเดือนก่อน
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block mt-6 overflow-x-auto">
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
          </>
        )}
      </div>

      {/* ── ภาพรวมรายปี ─────────────────────────────────────── */}
      <div className="metric-card rounded-2xl overflow-hidden print:hidden">
        <button
          onClick={() => setYearlyOpen(v => !v)}
          className="w-full p-6 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary-container text-[20px]">calendar_today</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">ภาพรวมรายปี {selectedYear}</h3>
              <p className="font-label-caps text-label-caps text-on-surface-variant">
                รายรับรวม ฿{formatMoney(yearlyTotals.income)} · กำไรรวม ฿{formatMoney(yearlyTotals.profit)}
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant">
            {yearlyOpen ? "expand_less" : "expand_more"}
          </span>
        </button>

        {yearlyOpen && (
          <div className="px-6 pb-6 space-y-5">
            {/* KPI ปี */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "รายรับรวมปี", value: yearlyTotals.income, color: "text-primary" },
                { label: "รายจ่ายรวมปี", value: yearlyTotals.expense, color: "text-error" },
                { label: "กำไรสุทธิปี", value: yearlyTotals.profit, color: yearlyTotals.profit >= 0 ? "text-primary" : "text-error" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-surface-container rounded-xl p-3 text-center">
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 text-xs">{label}</p>
                  <p className={`font-semibold text-sm ${color}`}>฿{formatMoney(Math.abs(value))}</p>
                </div>
              ))}
            </div>

            {/* Bar chart 12 เดือน */}
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant mb-3">รายรับ vs รายจ่าย รายเดือน</p>
              <div className="flex items-end gap-1 h-32">
                {yearlyData.map(({ label, income: inc, expense: exp, monthKey }) => {
                  const isSelected = monthKey === selectedMonth;
                  const incH = yearlyMaxIncome > 0 ? (inc / yearlyMaxIncome) * 100 : 0;
                  const expH = yearlyMaxIncome > 0 ? (exp / yearlyMaxIncome) * 100 : 0;
                  return (
                    <div key={monthKey} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full flex items-end gap-0.5 h-24">
                        <div
                          className={`flex-1 rounded-t transition-all ${isSelected ? "bg-primary" : "bg-primary/40"}`}
                          style={{ height: `${incH}%`, minHeight: inc > 0 ? "3px" : "0" }}
                          title={`รายรับ ฿${formatMoney(inc)}`}
                        />
                        <div
                          className={`flex-1 rounded-t transition-all ${isSelected ? "bg-error" : "bg-error/40"}`}
                          style={{ height: `${expH}%`, minHeight: exp > 0 ? "3px" : "0" }}
                          title={`รายจ่าย ฿${formatMoney(exp)}`}
                        />
                      </div>
                      <span className={`font-label-caps text-label-caps text-[9px] ${isSelected ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-primary/60" />
                  <span className="font-label-caps text-label-caps text-on-surface-variant text-xs">รายรับ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-error/60" />
                  <span className="font-label-caps text-label-caps text-on-surface-variant text-xs">รายจ่าย</span>
                </div>
              </div>
            </div>

            {/* ตาราง 12 เดือน */}
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-surface-variant">
                    <th className="py-2 px-2 text-left font-label-caps text-label-caps text-on-surface-variant">เดือน</th>
                    <th className="py-2 px-2 text-right font-label-caps text-label-caps text-on-surface-variant">รายรับ</th>
                    <th className="py-2 px-2 text-right font-label-caps text-label-caps text-on-surface-variant">รายจ่าย</th>
                    <th className="py-2 px-2 text-right font-label-caps text-label-caps text-on-surface-variant">กำไร</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyData.map(({ monthKey, label, income: inc, expense: exp, profit: pro }) => {
                    const isSelected = monthKey === selectedMonth;
                    const hasData = inc > 0 || exp > 0;
                    return (
                      <tr key={monthKey} className={`border-b border-surface-variant last:border-0 ${isSelected ? "bg-primary-container/30" : ""}`}>
                        <td className={`py-2.5 px-2 font-body-md ${isSelected ? "text-primary font-semibold" : hasData ? "text-on-surface" : "text-on-surface-variant"}`}>
                          {label} {isSelected && "◀"}
                        </td>
                        <td className={`py-2.5 px-2 text-right font-price-table text-price-table tabular-nums ${hasData ? "text-primary" : "text-on-surface-variant"}`}>
                          {inc > 0 ? `฿${formatMoney(inc)}` : "—"}
                        </td>
                        <td className={`py-2.5 px-2 text-right font-price-table text-price-table tabular-nums ${hasData ? "text-error" : "text-on-surface-variant"}`}>
                          {exp > 0 ? `฿${formatMoney(exp)}` : "—"}
                        </td>
                        <td className={`py-2.5 px-2 text-right font-price-table text-price-table tabular-nums ${pro > 0 ? "text-primary" : pro < 0 ? "text-error" : "text-on-surface-variant"}`}>
                          {hasData ? `฿${formatMoney(pro)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-surface-variant bg-surface-container-low">
                    <td className="py-3 px-2 font-semibold text-on-surface">รวมทั้งปี</td>
                    <td className="py-3 px-2 text-right font-semibold text-primary tabular-nums">฿{formatMoney(yearlyTotals.income)}</td>
                    <td className="py-3 px-2 text-right font-semibold text-error tabular-nums">฿{formatMoney(yearlyTotals.expense)}</td>
                    <td className={`py-3 px-2 text-right font-semibold tabular-nums ${yearlyTotals.profit >= 0 ? "text-primary" : "text-error"}`}>
                      ฿{formatMoney(yearlyTotals.profit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>


      {/* ── Export Section — mobile only ───────────────────── */}
      <div className="md:hidden metric-card p-5 rounded-2xl print:hidden">
        <p className="font-label-caps text-label-caps text-on-surface-variant mb-3">ส่งออกรายงาน</p>
        <div className="flex flex-col gap-3">
          <button onClick={exportAccountant} className="btn-primary w-full">
            <span className="material-symbols-outlined text-[18px]">table_view</span>
            Export สรุปนักบัญชี (.xlsx)
          </button>
          <button onClick={exportPDF} className="btn-secondary w-full">
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            ส่งออก PDF
          </button>
        </div>
      </div>

    </div>{/* end web-only */}

    {/* ════════════════════════════════════════════════════════════════════════
        PROFESSIONAL PRINT LAYOUT — ซ่อนบนเว็บ แสดงเฉพาะตอน print
    ════════════════════════════════════════════════════════════════════════ */}
    <div className="print-only" style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif", color: "#1b1c19", fontSize: "11pt", lineHeight: 1.6 }}>

      {/* ── SECTION 1: Executive Summary ──────────────────────────────────── */}
      <div style={{ marginBottom: "28px" }}>

        {/* Brand header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #115637", paddingBottom: "10px", marginBottom: "18px" }}>
          <div>
            <div style={{ fontSize: "9pt", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#115637" }}>SLIPLESS · Restaurant Finance</div>
            <div style={{ fontSize: "20pt", fontWeight: 800, color: "#1b1c19", lineHeight: 1.2, marginTop: "2px" }}>{restaurantName}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "13pt", fontWeight: 700, color: "#1b1c19" }}>รายงานกำไรขาดทุน</div>
            <div style={{ fontSize: "10pt", color: "#707972", marginTop: "2px" }}>{formatMonthLabel(selectedMonth)}</div>
            <div style={{ fontSize: "9pt", color: "#9a9a9a", marginTop: "1px" }}>สร้างเมื่อ {printDate}</div>
          </div>
        </div>

        {/* KPI 4 กล่อง */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
          {[
            { label: "รายรับรวม", display: `฿${formatMoney(income)}`, color: "#115637" },
            { label: "รายจ่ายรวม", display: `฿${formatMoney(expense)}`, color: "#ba1a1a" },
            { label: "กำไรสุทธิ", display: `${profit >= 0 ? "+" : "-"}฿${formatMoney(Math.abs(profit))}`, color: profit >= 0 ? "#115637" : "#ba1a1a" },
            { label: "อัตรากำไร", display: `${margin.toFixed(1)}%`, color: margin >= 20 ? "#115637" : margin >= 10 ? "#cc8800" : "#ba1a1a" },
          ].map((kpi) => (
            <div key={kpi.label} style={{ border: "1px solid #d8d3ca", borderRadius: "8px", padding: "10px 12px", background: "#f7f4ef" }}>
              <div style={{ fontSize: "8pt", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#707972", marginBottom: "4px" }}>{kpi.label}</div>
              <div style={{ fontSize: "15pt", fontWeight: 800, color: kpi.color }}>{kpi.display}</div>
            </div>
          ))}
        </div>

        {/* % เทียบเดือนก่อน */}
        {!growthIncome.noData && (
          <div style={{ display: "flex", gap: "20px", marginBottom: "14px", fontSize: "9pt", color: "#707972", padding: "6px 0", borderBottom: "1px solid #ede8e1" }}>
            <span>รายรับ <strong style={{ color: growthIncome.up ? "#115637" : "#ba1a1a" }}>{growthIncome.text}</strong></span>
            <span>รายจ่าย <strong style={{ color: growthExpense.up ? "#ba1a1a" : "#115637" }}>{growthExpense.text}</strong></span>
            <span>กำไร <strong style={{ color: growthProfit.up ? "#115637" : "#ba1a1a" }}>{growthProfit.text}</strong></span>
            {!growthMargin.noData && <span>Margin <strong style={{ color: growthMargin.up ? "#115637" : "#ba1a1a" }}>{growthMargin.text}</strong></span>}
          </div>
        )}

        {/* AI Summary */}
        <div style={{ background: "#f0ede6", borderLeft: "3px solid #115637", padding: "12px 16px", borderRadius: "0 6px 6px 0" }}>
          <div style={{ fontSize: "8pt", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#115637", marginBottom: "7px" }}>สรุปภาพรวมธุรกิจ</div>
          <div style={{ fontSize: "10pt", lineHeight: 1.8, color: "#1b1c19" }}>
            <div>• {aiSummary.profitText}</div>
            <div>• {aiSummary.marginText}</div>
            <div>• {aiSummary.topExpenseText}</div>
            <div>• {aiSummary.advice}</div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: รายรับแยกหมวดหมู่ ─────────────────────────────────── */}
      <div style={{ breakBefore: "page" }}>
        <div style={{ fontSize: "12pt", fontWeight: 700, color: "#115637", borderBottom: "1px solid #d8d3ca", paddingBottom: "6px", marginBottom: "12px" }}>
          รายรับแยกตามหมวดหมู่ · {formatMonthLabel(selectedMonth)}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginBottom: "16px" }}>
          <thead>
            <tr style={{ background: "#f0ede6" }}>
              <th style={{ textAlign: "left", padding: "7px 10px", fontWeight: 600 }}>หมวดหมู่</th>
              <th style={{ textAlign: "right", padding: "7px 10px", fontWeight: 600 }}>จำนวน (บาท)</th>
              <th style={{ textAlign: "right", padding: "7px 10px", fontWeight: 600 }}>สัดส่วน</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(incomeBreak).sort((a, b) => b[1] - a[1]).map(([cat, amt], i) => (
              <tr key={cat} style={{ background: i % 2 === 0 ? "#fff" : "#f9f7f4", borderBottom: "1px solid #ede8e1" }}>
                <td style={{ padding: "7px 10px" }}>{cat}</td>
                <td style={{ textAlign: "right", padding: "7px 10px", fontWeight: 600 }}>฿{formatMoney(amt)}</td>
                <td style={{ textAlign: "right", padding: "7px 10px", color: "#707972" }}>
                  {income > 0 ? ((amt / income) * 100).toFixed(1) + "%" : "—"}
                </td>
              </tr>
            ))}
            {Object.keys(incomeBreak).length === 0 && (
              <tr><td colSpan={3} style={{ padding: "10px", color: "#9a9a9a", textAlign: "center" }}>ไม่มีข้อมูลรายรับเดือนนี้</td></tr>
            )}
            <tr style={{ borderTop: "2px solid #115637", fontWeight: 700 }}>
              <td style={{ padding: "7px 10px" }}>รวมทั้งสิ้น</td>
              <td style={{ textAlign: "right", padding: "7px 10px" }}>฿{formatMoney(income)}</td>
              <td style={{ textAlign: "right", padding: "7px 10px" }}>100%</td>
            </tr>
          </tbody>
        </table>
        {/* Bar chart */}
        <div style={{ marginTop: "4px" }}>
          {Object.entries(incomeBreak).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
            const pct = income > 0 ? (amt / income) * 100 : 0;
            return (
              <div key={cat} style={{ marginBottom: "7px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9pt", marginBottom: "3px" }}>
                  <span>{cat}</span><span style={{ color: "#115637", fontWeight: 600 }}>{pct.toFixed(1)}%</span>
                </div>
                <div style={{ height: "7px", background: "#e8e3dc", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "#115637", borderRadius: "4px" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 3: รายจ่ายแยกหมวดหมู่ ─────────────────────────────────── */}
      <div style={{ breakBefore: "page" }}>
        <div style={{ fontSize: "12pt", fontWeight: 700, color: "#ba1a1a", borderBottom: "1px solid #d8d3ca", paddingBottom: "6px", marginBottom: "12px" }}>
          รายจ่ายแยกตามหมวดหมู่ · {formatMonthLabel(selectedMonth)}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginBottom: "16px" }}>
          <thead>
            <tr style={{ background: "#f0ede6" }}>
              <th style={{ textAlign: "left", padding: "7px 10px", fontWeight: 600 }}>หมวดหมู่</th>
              <th style={{ textAlign: "right", padding: "7px 10px", fontWeight: 600 }}>จำนวน (บาท)</th>
              <th style={{ textAlign: "right", padding: "7px 10px", fontWeight: 600 }}>สัดส่วน</th>
            </tr>
          </thead>
          <tbody>
            {report.expenseBreakdown.map((e, i) => (
              <tr key={e.category} style={{ background: i % 2 === 0 ? "#fff" : "#f9f7f4", borderBottom: "1px solid #ede8e1" }}>
                <td style={{ padding: "7px 10px" }}>{e.category}</td>
                <td style={{ textAlign: "right", padding: "7px 10px", fontWeight: 600 }}>฿{formatMoney(e.amount)}</td>
                <td style={{ textAlign: "right", padding: "7px 10px", color: "#707972" }}>
                  {expense > 0 ? ((e.amount / expense) * 100).toFixed(1) + "%" : "—"}
                </td>
              </tr>
            ))}
            {report.expenseBreakdown.length === 0 && (
              <tr><td colSpan={3} style={{ padding: "10px", color: "#9a9a9a", textAlign: "center" }}>ไม่มีข้อมูลรายจ่ายเดือนนี้</td></tr>
            )}
            <tr style={{ borderTop: "2px solid #ba1a1a", fontWeight: 700 }}>
              <td style={{ padding: "7px 10px" }}>รวมทั้งสิ้น</td>
              <td style={{ textAlign: "right", padding: "7px 10px" }}>฿{formatMoney(expense)}</td>
              <td style={{ textAlign: "right", padding: "7px 10px" }}>100%</td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: "4px" }}>
          {report.expenseBreakdown.map((e) => {
            const pct = expense > 0 ? (e.amount / expense) * 100 : 0;
            return (
              <div key={e.category} style={{ marginBottom: "7px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9pt", marginBottom: "3px" }}>
                  <span>{e.category}</span><span style={{ color: "#ba1a1a", fontWeight: 600 }}>{pct.toFixed(1)}%</span>
                </div>
                <div style={{ height: "7px", background: "#e8e3dc", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "#ba1a1a", borderRadius: "4px" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 4: วิเคราะห์ต้นทุน ───────────────────────────────────── */}
      <div style={{ breakBefore: "page" }}>
        <div style={{ fontSize: "12pt", fontWeight: 700, color: "#1b1c19", borderBottom: "1px solid #d8d3ca", paddingBottom: "6px", marginBottom: "14px" }}>
          วิเคราะห์ต้นทุน · {formatMonthLabel(selectedMonth)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          {/* Cost structure */}
          <div>
            <div style={{ fontSize: "8pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#707972", marginBottom: "10px" }}>โครงสร้างต้นทุน</div>
            <table style={{ width: "100%", fontSize: "10pt", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  { label: "รายรับ", val: `฿${formatMoney(income)}`, c: "#115637" },
                  { label: "รายจ่ายรวม", val: `฿${formatMoney(expense)}`, c: "#ba1a1a" },
                  { label: "ต้นทุนต่อรายรับ", val: income > 0 ? `${((expense / income) * 100).toFixed(1)}%` : "—", c: "#1b1c19" },
                  { label: "อัตรากำไร", val: `${margin.toFixed(1)}%`, c: margin >= 20 ? "#115637" : "#ba1a1a" },
                ].map((row) => (
                  <tr key={row.label} style={{ borderBottom: "1px solid #ede8e1" }}>
                    <td style={{ padding: "5px 0", color: "#707972" }}>{row.label}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: row.c }}>{row.val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top 3 cost drivers */}
          <div>
            <div style={{ fontSize: "8pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#707972", marginBottom: "10px" }}>Top 3 ค่าใช้จ่ายสูงสุด</div>
            {report.expenseBreakdown.slice(0, 3).map((e, i) => (
              <div key={e.category} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #ede8e1", fontSize: "10pt" }}>
                <span style={{ color: "#707972", marginRight: "8px", fontWeight: 700 }}>#{i + 1}</span>
                <span style={{ flex: 1 }}>{e.category}</span>
                <span style={{ fontWeight: 700, color: "#ba1a1a" }}>฿{formatMoney(e.amount)}</span>
                <span style={{ color: "#9a9a9a", fontSize: "9pt", marginLeft: "8px" }}>
                  ({expense > 0 ? ((e.amount / expense) * 100).toFixed(1) : "—"}%)
                </span>
              </div>
            ))}
            {report.expenseBreakdown.length === 0 && (
              <p style={{ color: "#9a9a9a", fontSize: "10pt" }}>ไม่มีข้อมูลรายจ่าย</p>
            )}
          </div>
        </div>

        {/* พยากรณ์เดือนหน้า */}
        {forecast.avgIncome > 0 && (
          <div style={{ background: "#f0ede6", borderRadius: "8px", padding: "14px 16px" }}>
            <div style={{ fontSize: "8pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#115637", marginBottom: "10px" }}>
              พยากรณ์เดือนหน้า · เฉลี่ยจาก {forecast.months} เดือนย้อนหลัง
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", fontSize: "10pt" }}>
              <div>
                <div style={{ color: "#707972", fontSize: "9pt", marginBottom: "2px" }}>รายรับคาดการณ์</div>
                <div style={{ fontWeight: 700, color: "#115637" }}>฿{formatMoney(Math.round(forecast.avgIncome))}</div>
              </div>
              <div>
                <div style={{ color: "#707972", fontSize: "9pt", marginBottom: "2px" }}>รายจ่ายคาดการณ์</div>
                <div style={{ fontWeight: 700, color: "#ba1a1a" }}>฿{formatMoney(Math.round(forecast.avgExpense))}</div>
              </div>
              <div>
                <div style={{ color: "#707972", fontSize: "9pt", marginBottom: "2px" }}>กำไรคาดการณ์</div>
                <div style={{ fontWeight: 700, color: forecast.avgProfit >= 0 ? "#115637" : "#ba1a1a" }}>
                  {forecast.avgProfit >= 0 ? "+" : ""}฿{formatMoney(Math.round(forecast.avgProfit))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 5: รายการธุรกรรมล่าสุด ─────────────────────────────────── */}
      <div style={{ breakBefore: "page" }}>
        <div style={{ fontSize: "12pt", fontWeight: 700, color: "#1b1c19", borderBottom: "1px solid #d8d3ca", paddingBottom: "6px", marginBottom: "12px" }}>
          รายการธุรกรรม · {formatMonthLabel(selectedMonth)}
          {monthTxns.length === 50 && <span style={{ fontWeight: 400, fontSize: "9pt", color: "#9a9a9a", marginLeft: "8px" }}>(แสดง 50 รายการล่าสุด)</span>}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt" }}>
          <thead>
            <tr style={{ background: "#f0ede6" }}>
              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>วันที่</th>
              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>ประเภท</th>
              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>หมวดหมู่</th>
              <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>จำนวน (บาท)</th>
              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {monthTxns.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "12px", color: "#9a9a9a", textAlign: "center" }}>ไม่มีรายการเดือนนี้</td></tr>
            )}
            {monthTxns.map((t, i) => (
              <tr key={t.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9f7f4", borderBottom: "1px solid #ede8e1" }}>
                <td style={{ padding: "5px 8px", whiteSpace: "nowrap", color: "#707972" }}>{t.date}</td>
                <td style={{ padding: "5px 8px" }}>
                  <span style={{ color: t.type === "income" ? "#115637" : "#ba1a1a", fontWeight: 600 }}>
                    {t.type === "income" ? "รายรับ" : "รายจ่าย"}
                  </span>
                </td>
                <td style={{ padding: "5px 8px" }}>{t.category ?? "—"}</td>
                <td style={{ textAlign: "right", padding: "5px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>
                  <span style={{ color: t.type === "income" ? "#115637" : "#ba1a1a" }}>
                    {t.type === "income" ? "+" : "-"}฿{formatMoney(t.amount)}
                  </span>
                </td>
                <td style={{ padding: "5px 8px", color: "#707972", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.description ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "28px", paddingTop: "8px", borderTop: "1px solid #d8d3ca", fontSize: "8.5pt", color: "#9a9a9a", display: "flex", justifyContent: "space-between" }}>
        <span>สร้างโดย Slipless · Restaurant Finance System</span>
        <span>{printDate}</span>
      </div>

    </div>
    </>
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
