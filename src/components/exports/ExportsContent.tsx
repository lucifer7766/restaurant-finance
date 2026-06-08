"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import { useMonthFilter } from "@/context/MonthFilterContext";
import { useRestaurantName } from "@/lib/restaurantSettings";
import {
  getMonthlyReportFromTransactions,
  filterTransactionsByMonth,
  type RecentTransaction,
} from "@/lib/data";
import { formatMonthLabel, getCategoryLabel } from "@/lib/utils";

/* ─── Color system ───────────────────────────────────────────────────────── */
const C = {
  pdf:              "#1b4332", // Deep Forest Green
  excel:            "#2d6a4f", // Warm Emerald
  csvAll:           "#1d3557", // Navy Blue
  csvIncome:        "#1a535c", // Teal
  csvExpense:       "#7b3f2f", // Terracotta
  incomeBreakdown:  "#4d5c1e", // Olive
  expenseBreakdown: "#5c3416", // Warm Brown
  profit:           "#7a6020", // Muted Gold
} as const;

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
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

/* ─── ExportsContent ─────────────────────────────────────────────────────── */
export function ExportsContent() {
  const { transactions, isLoading } = useTransactions();
  const { selectedMonth } = useMonthFilter();
  const [restaurantName] = useRestaurantName();
  const router = useRouter();
  const selectedYear = selectedMonth.slice(0, 4);
  const downloadedRef = useRef(false);

  const report = useMemo(
    () => getMonthlyReportFromTransactions(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const { income, expense, profit, margin } = useMemo(() => ({
    income: report.totalIncome,
    expense: report.totalExpenses,
    profit: report.netProfit,
    margin: report.profitMargin,
  }), [report]);

  const incomeBreak = useMemo(
    () => getIncomeBreakdown(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const yearlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mk = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
      const r = getMonthlyReportFromTransactions(transactions, mk);
      return { label: THAI_MONTHS[i], income: r.totalIncome, expense: r.totalExpenses, profit: r.netProfit };
    });
  }, [transactions, selectedYear]);

  const yearlyTotals = useMemo(() => ({
    income: yearlyData.reduce((s, d) => s + d.income, 0),
    expense: yearlyData.reduce((s, d) => s + d.expense, 0),
    profit: yearlyData.reduce((s, d) => s + d.profit, 0),
  }), [yearlyData]);

  /* ── Export handlers ──────────────────────────────────────────────────── */

  const handleExportPDF = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("slipless_trigger_print", "1");
    }
    router.push("/reports");
  }, [router]);

  const handleExportAccountant = useCallback(() => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["สรุปรายงานการเงิน", formatMonthLabel(selectedMonth)],
      [],
      ["รายการ", "จำนวนเงิน (บาท)"],
      ["รายรับรวม", income],
      ["รายจ่ายรวม", expense],
      ["กำไรสุทธิ", profit],
      ["อัตรากำไร (%)", Number(margin.toFixed(2))],
    ]), "สรุปเดือนนี้");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["หมวดหมู่", "จำนวนเงิน (บาท)", "สัดส่วน (%)"],
      ...report.expenseBreakdown.map(e => [
        e.category, e.amount,
        expense > 0 ? Number(((e.amount / expense) * 100).toFixed(2)) : 0,
      ]),
    ]), "รายจ่ายแยกหมวด");

    const all = filterTransactionsByMonth(transactions, selectedMonth);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["วันที่", "ประเภท", "หมวดหมู่", "จำนวนเงิน (บาท)", "หมายเหตุ"],
      ...all.map(t => [
        t.date, t.type === "income" ? "รายรับ" : "รายจ่าย",
        getCategoryLabel(t.category), t.amount, t.description ?? "",
      ]),
    ]), "รายการทั้งหมด");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["เดือน", "รายรับ", "รายจ่าย", "กำไรสุทธิ"],
      ...yearlyData.map(d => [d.label, d.income, d.expense, d.profit]),
      [],
      ["รวมทั้งปี", yearlyTotals.income, yearlyTotals.expense, yearlyTotals.profit],
    ]), `ภาพรวมปี ${selectedYear}`);

    XLSX.writeFile(wb, `รายงานการเงิน-${selectedMonth}.xlsx`);
  }, [income, expense, profit, margin, report, transactions, selectedMonth, yearlyData, yearlyTotals, selectedYear]);

  const handleExportAllTxns = useCallback(() => {
    const txns = filterTransactionsByMonth(transactions, selectedMonth);
    downloadCSV(`ธุรกรรมทั้งหมด-${selectedMonth}.csv`, [
      ["วันที่", "ประเภท", "หมวดหมู่", "จำนวนเงิน (บาท)", "หมายเหตุ"],
      ...txns.map(t => [
        t.date, t.type === "income" ? "รายรับ" : "รายจ่าย",
        getCategoryLabel(t.category), t.amount, t.description ?? "",
      ]),
    ]);
  }, [transactions, selectedMonth]);

  const handleExportIncome = useCallback(() => {
    const txns = filterTransactionsByMonth(transactions, selectedMonth).filter(t => t.type === "income");
    downloadCSV(`รายรับ-${selectedMonth}.csv`, [
      ["วันที่", "หมวดหมู่", "จำนวนเงิน (บาท)", "หมายเหตุ"],
      ...txns.map(t => [t.date, getCategoryLabel(t.category), t.amount, t.description ?? ""]),
    ]);
  }, [transactions, selectedMonth]);

  const handleExportExpense = useCallback(() => {
    const txns = filterTransactionsByMonth(transactions, selectedMonth).filter(t => t.type === "expense");
    downloadCSV(`รายจ่าย-${selectedMonth}.csv`, [
      ["วันที่", "หมวดหมู่", "จำนวนเงิน (บาท)", "หมายเหตุ"],
      ...txns.map(t => [t.date, getCategoryLabel(t.category), t.amount, t.description ?? ""]),
    ]);
  }, [transactions, selectedMonth]);

  const handleExportIncomeBreakdown = useCallback(() => {
    const entries = Object.entries(incomeBreak).sort((a, b) => b[1] - a[1]);
    downloadCSV(`รายรับแยกหมวด-${selectedMonth}.csv`, [
      ["หมวดหมู่", "จำนวนเงิน (บาท)", "สัดส่วน (%)"],
      ...entries.map(([cat, amt]) => [
        cat, amt,
        income > 0 ? ((amt / income) * 100).toFixed(1) + "%" : "—",
      ]),
      ["รวมทั้งสิ้น", income, "100%"],
    ]);
  }, [incomeBreak, income, selectedMonth]);

  const handleExportExpenseBreakdown = useCallback(() => {
    downloadCSV(`รายจ่ายแยกหมวด-${selectedMonth}.csv`, [
      ["หมวดหมู่", "จำนวนเงิน (บาท)", "สัดส่วน (%)"],
      ...report.expenseBreakdown.map(e => [
        e.category, e.amount,
        expense > 0 ? ((e.amount / expense) * 100).toFixed(1) + "%" : "—",
      ]),
      ["รวมทั้งสิ้น", expense, "100%"],
    ]);
  }, [report, expense, selectedMonth]);

  const handleExportProfitCSV = useCallback(() => {
    downloadCSV(`รายงานกำไร-${selectedMonth}.csv`, [
      ["รายการ", "จำนวนเงิน (บาท)"],
      ["รายรับรวม", income],
      ["รายจ่ายรวม", expense],
      ["กำไรสุทธิ", profit],
      ["อัตรากำไร (%)", margin.toFixed(2) + "%"],
      [],
      ["หมวดรายจ่าย", "จำนวน (บาท)", "สัดส่วน (%)"],
      ...report.expenseBreakdown.map(e => [
        e.category, e.amount,
        expense > 0 ? ((e.amount / expense) * 100).toFixed(1) + "%" : "—",
      ]),
    ]);
  }, [income, expense, profit, margin, report, selectedMonth]);

  /* ── Cards definition ─────────────────────────────────────────────────── */
  const cards = [
    {
      color: C.pdf,
      icon: "picture_as_pdf",
      tag: "PDF",
      title: "รายงานสรุปผู้บริหาร",
      desc: "สรุป KPI รายเดือน พร้อม AI Summary ทุกหน้า",
      btnLabel: "ดาวน์โหลด PDF",
      onClick: handleExportPDF,
      note: "นำทางไปยังหน้ารายงานและพิมพ์อัตโนมัติ",
    },
    {
      color: C.excel,
      icon: "table_chart",
      tag: "Excel",
      title: "ข้อมูลธุรกิจแบบ Spreadsheet",
      desc: "4 Sheets: สรุปเดือน · รายจ่ายแยกหมวด · ธุรกรรม · ภาพรวมปี",
      btnLabel: "ดาวน์โหลด Excel",
      onClick: handleExportAccountant,
    },
    {
      color: C.csvAll,
      icon: "receipt_long",
      tag: "CSV",
      title: "ธุรกรรมทั้งหมด",
      desc: "รายการรับ-จ่ายทั้งหมดในเดือนที่เลือก",
      btnLabel: "ดาวน์โหลด CSV",
      onClick: handleExportAllTxns,
    },
    {
      color: C.csvIncome,
      icon: "payments",
      tag: "CSV รายรับ",
      title: "รายรับทั้งหมด",
      desc: "รายการรายรับในเดือนที่เลือก",
      btnLabel: "ดาวน์โหลด CSV",
      onClick: handleExportIncome,
    },
    {
      color: C.csvExpense,
      icon: "receipt",
      tag: "CSV รายจ่าย",
      title: "รายจ่ายทั้งหมด",
      desc: "รายการรายจ่ายในเดือนที่เลือก",
      btnLabel: "ดาวน์โหลด CSV",
      onClick: handleExportExpense,
    },
    {
      color: C.incomeBreakdown,
      icon: "bar_chart",
      tag: "CSV",
      title: "รายรับแยกหมวดหมู่",
      desc: "สัดส่วนรายรับแต่ละหมวด พร้อม %",
      btnLabel: "ดาวน์โหลด CSV",
      onClick: handleExportIncomeBreakdown,
    },
    {
      color: C.expenseBreakdown,
      icon: "pie_chart",
      tag: "CSV",
      title: "รายจ่ายแยกหมวดหมู่",
      desc: "สัดส่วนค่าใช้จ่ายแต่ละหมวด พร้อม %",
      btnLabel: "ดาวน์โหลด CSV",
      onClick: handleExportExpenseBreakdown,
    },
    {
      color: C.profit,
      icon: "trending_up",
      tag: "CSV",
      title: "รายงานกำไรสรุป",
      desc: "KPI สรุป พร้อมรายจ่ายแยกหมวด",
      btnLabel: "ดาวน์โหลด CSV",
      onClick: handleExportProfitCSV,
    },
  ];

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* Page header */}
      <div className="page-header-card rounded-2xl px-5 py-4 flex items-center gap-4" style={{ borderLeftColor: C.pdf }}>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${C.pdf} 0%, ${C.excel} 100%)` }}
        >
          <span className="material-symbols-outlined text-white text-[22px]">download</span>
        </div>
        <div className="flex-1">
          <p style={{ fontSize: "11px", fontWeight: 600, color: C.pdf, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "2px" }}>
            {restaurantName || "ร้านอาหารของฉัน"}
          </p>
          <h2 style={{ fontFamily: "var(--font-manrope)", fontSize: "20px", fontWeight: 800, color: "#1b1c19", lineHeight: 1.2 }}>
            ส่งออกไฟล์
          </h2>
          <p style={{ fontSize: "12px", color: "#707972", marginTop: "2px" }}>
            ข้อมูลเดือน {formatMonthLabel(selectedMonth)}
            {income > 0 && (
              <span style={{ marginLeft: "8px", color: C.pdf, fontWeight: 600 }}>
                · รายรับ ฿{fmt(income)} · กำไร ฿{fmt(profit)}
              </span>
            )}
          </p>
        </div>
        <Link
          href="/reports"
          className="hidden md:flex items-center gap-1.5 shrink-0"
          style={{ fontSize: "12px", color: "#707972" }}
        >
          <span className="material-symbols-outlined text-[15px]">leaderboard</span>
          ดูรายงาน
        </Link>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="metric-card rounded-2xl p-5 animate-pulse">
              <div className="w-11 h-11 bg-surface-container-highest rounded-xl mb-3" />
              <div className="h-2 bg-surface-container-highest rounded w-1/3 mb-2" />
              <div className="h-4 bg-surface-container-highest rounded w-4/5 mb-1.5" />
              <div className="h-3 bg-surface-container-highest rounded w-full mb-1" />
              <div className="h-3 bg-surface-container-highest rounded w-3/4 mb-5" />
              <div className="h-9 bg-surface-container-highest rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="metric-card rounded-2xl p-4 md:p-5 flex flex-col"
            >
              {/* Icon circle */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 shrink-0"
                style={{ background: card.color }}
              >
                <span className="material-symbols-outlined text-white text-[20px]">{card.icon}</span>
              </div>

              {/* Tag */}
              <span style={{
                fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: card.color, marginBottom: "3px",
              }}>
                {card.tag}
              </span>

              {/* Title */}
              <p style={{
                fontFamily: "var(--font-manrope)", fontSize: "14px", fontWeight: 700,
                color: "#1b1c19", lineHeight: 1.3, marginBottom: "4px",
              }}>
                {card.title}
              </p>

              {/* Description */}
              <p style={{ fontSize: "11px", color: "#707972", lineHeight: 1.5, marginBottom: "14px", flex: 1 }}>
                {card.desc}
              </p>

              {/* Download button */}
              <button
                onClick={card.onClick}
                className="flex items-center justify-center gap-1.5 w-full rounded-xl transition-all hover:opacity-88 active:scale-95"
                style={{
                  background: card.color, color: "#ffffff",
                  padding: "9px 12px", fontSize: "12px", fontWeight: 600,
                }}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {card.tag === "PDF" ? "open_in_new" : "download"}
                </span>
                <span className="truncate">{card.btnLabel}</span>
              </button>

              {/* Optional note (PDF only) */}
              {card.note && (
                <p style={{ fontSize: "9px", color: "#9a9a9a", textAlign: "center", marginTop: "5px", lineHeight: 1.4 }}>
                  {card.note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      <p style={{ fontSize: "11px", color: "#9a9a9a", textAlign: "center", paddingTop: "4px" }}>
        ไฟล์ทั้งหมดบันทึกข้อมูลเดือน {formatMonthLabel(selectedMonth)} · เปลี่ยนเดือนได้จากตัวเลือกด้านบน
      </p>
    </div>
  );
}
