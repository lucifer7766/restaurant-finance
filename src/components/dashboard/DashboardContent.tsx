"use client";

import { useMemo, useState } from "react";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { useMonthFilter } from "@/context/MonthFilterContext";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import EditTransactionModal from "@/components/transactions/EditTransactionModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import {
  filterTransactionsByMonth,
  getMonthlyReportFromTransactions,
} from "@/lib/data";
import { formatBaht, formatMonthLabel, formatTransactionDate, getCategoryLabel, formatPosNote, getCategoryMeta } from "@/lib/utils";
import { MonthlyGoalCard } from "@/components/dashboard/MonthlyGoalCard";

const THAI_MONTHS_SHORT = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

export function DashboardContent() {
  const { selectedMonth, availableMonths } = useMonthFilter();
  const { transactions, isLoading, error, deleteTransaction, refreshTransactions } = useTransactions();
  const [showAllTx, setShowAllTx] = useState(false);
  const [txFilter, setTxFilter] = useState<"all" | "income" | "expense">("all");
  const [editingTx, setEditingTx] = useState<Parameters<typeof EditTransactionModal>[0]["transaction"]>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareMonth, setCompareMonth] = useState("");
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  /* cumulative net สะสมถึงสิ้นเดือนที่เลือก (BUG-008) */
  const cumulativeNet = useMemo(() => {
    return transactions
      .filter((t) => t.date.slice(0, 7) <= selectedMonth)
      .reduce((s, t) => (t.type === "income" ? s + t.amount : s - t.amount), 0);
  }, [transactions, selectedMonth]);

  const prevCumulativeNet = useMemo(() => {
    return transactions
      .filter((t) => t.date.slice(0, 7) <= previousMonthKey)
      .reduce((s, t) => (t.type === "income" ? s + t.amount : s - t.amount), 0);
  }, [transactions, previousMonthKey]);

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
  // Default เป็น previous month ถ้ามีใน list; ไม่งั้นใช้เดือนล่าสุดที่มีข้อมูล
  const defaultCompareMonth = compareMonthOptions.includes(previousMonthKey)
    ? previousMonthKey
    : (compareMonthOptions[compareMonthOptions.length - 1] ?? "");
  const effectiveCompareMonth = compareMonth && compareMonth !== selectedMonth ? compareMonth : defaultCompareMonth;
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

      {/* ── HERO SECTION ───────────────────────────────────── */}
      <div className="card-hero rounded-2xl p-6">
        {/* Top row: label + alert badge */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.65)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              ภาพรวมธุรกิจ · {monthLabel}
            </p>
          </div>
          <span
            className="flex items-center gap-1 px-3 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.18)", fontSize: "11px", color: "rgba(255,255,255,0.9)", fontWeight: 600 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#acefc6" }}>{alert.icon}</span>
            {revenueGrowth > 0 ? "กำลังเติบโต" : revenueGrowth < 0 ? "ควรเพิ่มยอด" : "ทรงตัว"}
          </span>
        </div>

        {/* Main income figure */}
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.60)", marginBottom: "4px" }}>รายรับเดือนนี้</p>
        <div className="flex items-baseline gap-2 mb-2">
          <span style={{ fontSize: "28px", fontWeight: 700, color: "rgba(255,255,255,0.70)" }}>฿</span>
          <span style={{ fontFamily: "var(--font-manrope)", fontSize: "52px", fontWeight: 800, color: "#ffffff", lineHeight: 1, letterSpacing: "-0.02em" }}>
            {report.totalIncome.toLocaleString("th-TH")}
          </span>
        </div>

        {/* Income trend */}
        {revenueGrowth !== 0 && prevReport.totalIncome > 0 && (
          <div className="flex items-center gap-1.5 mb-5">
            <span className="material-symbols-outlined" style={{ fontSize: "16px", color: revenueGrowth > 0 ? "#acefc6" : "#fca5a5" }}>
              {revenueGrowth > 0 ? "trending_up" : "trending_down"}
            </span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: revenueGrowth > 0 ? "#acefc6" : "#fca5a5" }}>
              {revenueGrowth > 0 ? "+" : ""}{revenueGrowth.toFixed(1)}% จากเดือนก่อน
            </span>
          </div>
        )}

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[
            { label: "รายจ่าย", value: `฿${report.totalExpenses.toLocaleString("th-TH")}`, color: "#fca5a5" },
            { label: "กำไรสุทธิ", value: `฿${Math.abs(report.netProfit).toLocaleString("th-TH")}`, color: report.netProfit >= 0 ? "#acefc6" : "#fca5a5" },
            { label: "อัตรากำไร", value: `${report.profitMargin.toFixed(1)}%`, color: "#acefc6" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.12)" }}>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.60)", marginBottom: "4px", fontWeight: 500 }}>{label}</p>
              <p style={{ fontSize: "15px", fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Compare button inside hero */}
        <button
          onClick={() => setShowCompare(true)}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl w-full justify-center"
          style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)", fontSize: "13px", fontWeight: 600 }}
        >
          <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
          เปรียบเทียบเดือน
        </button>
      </div>

      {/* ── Error banner ───────────────────────────────────── */}
      {error && (
        <div className="metric-card p-4 rounded-xl flex items-center gap-3 border-l-4 border-error">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-on-surface">{error}</p>
        </div>
      )}

      {/* ── KPI Row 1: รายรับ | รายจ่าย ───────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* รายรับเดือนนี้ */}
        <div className="kpi-card p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#707972", letterSpacing: "0.03em" }}>รายรับ</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(17,86,55,0.12)" }}>
              <span className="material-symbols-outlined text-[16px]" style={{ color: "#115637" }}>payments</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1" style={{ color: "#115637" }}>
            <span className="text-base font-bold opacity-60">฿</span>
            <span className="text-2xl font-bold tracking-tight leading-none" style={{ fontFamily: "var(--font-manrope)" }}>
              {report.totalIncome.toLocaleString("th-TH")}
            </span>
          </div>
          {revenueGrowth !== 0 && (
            <div className={`mt-2 flex items-center gap-1 ${revenueGrowth > 0 ? "text-primary" : "text-error"}`}>
              <span className="material-symbols-outlined text-[14px]">
                {revenueGrowth > 0 ? "trending_up" : "trending_down"}
              </span>
              <span style={{ fontSize: "10px", fontWeight: 600 }}>
                {revenueGrowth > 0 ? "+" : ""}{revenueGrowth.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* รายจ่ายเดือนนี้ */}
        <div className="kpi-card p-5 rounded-2xl" style={{ borderTopColor: "#ba1a1a" }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#707972", letterSpacing: "0.03em" }}>รายจ่าย</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(186,26,26,0.10)" }}>
              <span className="material-symbols-outlined text-[16px]" style={{ color: "#ba1a1a" }}>receipt_long</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 text-error">
            <span className="text-base font-bold opacity-60">฿</span>
            <span className="text-2xl font-bold tracking-tight leading-none" style={{ fontFamily: "var(--font-manrope)" }}>
              {report.totalExpenses.toLocaleString("th-TH")}
            </span>
          </div>
          {expenseGrowth !== 0 && (
            <div className={`mt-2 flex items-center gap-1 ${expenseGrowth > 0 ? "text-error" : "text-primary"}`}>
              <span className="material-symbols-outlined text-[14px]">
                {expenseGrowth > 0 ? "trending_up" : "trending_down"}
              </span>
              <span style={{ fontSize: "10px", fontWeight: 600 }}>
                {expenseGrowth > 0 ? "+" : ""}{expenseGrowth.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

      </div>

      {/* ── KPI Row 2: กำไรสุทธิ | อัตรากำไร ──────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* กำไรสุทธิ */}
        <div className="kpi-card p-5 rounded-2xl" style={{ borderTopColor: report.netProfit >= 0 ? "#115637" : "#ba1a1a" }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#707972", letterSpacing: "0.03em" }}>กำไรสุทธิ</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: report.netProfit >= 0 ? "rgba(17,86,55,0.12)" : "rgba(186,26,26,0.10)" }}>
              <span className="material-symbols-outlined text-[16px]" style={{ color: report.netProfit >= 0 ? "#115637" : "#ba1a1a" }}>
                {report.netProfit >= 0 ? "savings" : "warning"}
              </span>
            </div>
          </div>
          <div className={`flex items-baseline gap-1 ${report.netProfit >= 0 ? "text-primary" : "text-error"}`}>
            <span className="text-base font-bold opacity-60">฿</span>
            <span className="text-2xl font-bold tracking-tight leading-none" style={{ fontFamily: "var(--font-manrope)" }}>
              {Math.abs(report.netProfit).toLocaleString("th-TH")}
            </span>
          </div>
          {report.netProfit < 0 && (
            <p className="mt-1 text-error" style={{ fontSize: "10px", fontWeight: 600 }}>ขาดทุน</p>
          )}
          {(() => {
            if (prevReport.totalIncome === 0 && prevReport.totalExpenses === 0) return null;
            const prev = prevReport.netProfit;
            if (prev === 0) return null;
            const pct = ((report.netProfit - prev) / Math.abs(prev)) * 100;
            const up = pct > 0;
            return (
              <div className={`mt-2 flex items-center gap-1 ${up ? "text-primary" : "text-error"}`}>
                <span className="material-symbols-outlined text-[14px]">{up ? "trending_up" : "trending_down"}</span>
                <span style={{ fontSize: "10px", fontWeight: 600 }}>
                  {up ? "+" : ""}{pct.toFixed(1)}%
                </span>
              </div>
            );
          })()}
        </div>

        {/* อัตรากำไร */}
        <div className="kpi-card p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#707972", letterSpacing: "0.03em" }}>อัตรากำไร</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(17,86,55,0.12)" }}>
              <span className="material-symbols-outlined text-[16px]" style={{ color: "#115637" }}>percent</span>
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-manrope)", color: report.profitMargin >= 15 ? "#115637" : report.profitMargin >= 0 ? "#1b1c19" : "#ba1a1a" }}>
            {report.profitMargin.toFixed(1)}%
          </span>
          {(() => {
            if (prevReport.totalIncome === 0 && prevReport.totalExpenses === 0) return null;
            const prev = prevReport.profitMargin;
            if (prev === 0) return <p className="mt-2 font-label-caps text-label-caps text-on-surface-variant" style={{ fontSize: "10px" }}>ไม่มีข้อมูลเดือนก่อน</p>;
            const diff = report.profitMargin - prev;
            const up = diff > 0;
            return (
              <div className={`mt-2 flex items-center gap-1 ${up ? "text-primary" : "text-error"}`}>
                <span className="material-symbols-outlined text-[14px]">{up ? "trending_up" : "trending_down"}</span>
                <span className="font-label-caps text-label-caps" style={{ fontSize: "10px" }}>
                  {up ? "+" : ""}{diff.toFixed(1)}% เทียบเดือนก่อน
                </span>
              </div>
            );
          })()}
        </div>

      </div>

      {/* ── KPI Row 3: ยอดสะสมสุทธิ (full width) ──────────── */}
      <div className="kpi-card p-5 rounded-2xl">
        <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1">
          เงินสดคงเหลือ (สะสม)
        </span>
        <p className="font-label-caps text-label-caps text-on-surface-variant mb-3" style={{ fontSize: "10px" }}>
          สะสมตั้งแต่เริ่มต้น · ไม่ใช่รายเดือน
        </p>
        <div className={`flex items-baseline gap-2 ${cumulativeNet >= 0 ? "text-on-surface" : "text-error"}`}>
          <span className="text-2xl font-bold opacity-60">฿</span>
          <span className="font-display-currency text-display-currency tracking-tight leading-none">
            {Math.abs(cumulativeNet).toLocaleString("th-TH")}
          </span>
        </div>
        {cumulativeNet < 0 && (
          <p className="mt-1 font-label-caps text-label-caps text-error">ยอดติดลบ</p>
        )}
        {prevCumulativeNet !== 0 && (() => {
          const diff = cumulativeNet - prevCumulativeNet;
          const pct = (diff / Math.abs(prevCumulativeNet)) * 100;
          const up = pct > 0;
          return (
            <div className={`mt-2 flex items-center gap-1 ${up ? "text-primary" : "text-error"}`}>
              <span className="material-symbols-outlined text-[14px]">{up ? "trending_up" : "trending_down"}</span>
              <span className="font-label-caps text-label-caps" style={{ fontSize: "10px" }}>
                {up ? "+" : ""}{pct.toFixed(1)}% เทียบเดือนก่อน
              </span>
            </div>
          );
        })()}
      </div>

      {/* ── สิ่งที่ควรจับตา ─────────────────────────────────── */}
      {transactions.length > 0 && (() => {
        const signals: { icon: string; color: string; text: string }[] = [];
        if (report.netProfit < 0)
          signals.push({ icon: "trending_down", color: "text-error", text: "กำไรติดลบเดือนนี้ — รายจ่ายสูงกว่ารายรับ" });
        else if (prevReport.netProfit > 0 && report.netProfit < prevReport.netProfit) {
          const pct = ((report.netProfit - prevReport.netProfit) / prevReport.netProfit) * 100;
          if (pct < -10) signals.push({ icon: "trending_down", color: "text-error", text: `กำไรลดลง ${Math.abs(pct).toFixed(1)}% จากเดือนก่อน` });
        }
        if (expenseGrowth > 10 && prevReport.totalExpenses > 0)
          signals.push({ icon: "warning", color: "text-error", text: `รายจ่ายเพิ่มขึ้น ${expenseGrowth.toFixed(1)}% จากเดือนก่อน — ควรตรวจสอบต้นทุน` });
        if (revenueGrowth < -5 && prevReport.totalIncome > 0)
          signals.push({ icon: "trending_down", color: "text-error", text: `รายรับลดลง ${Math.abs(revenueGrowth).toFixed(1)}% — ควรหาช่องทางเพิ่มยอดขาย` });
        if (report.expenseBreakdown[0] && totalExpensesSum > 0) {
          const top = report.expenseBreakdown[0];
          const pct = (top.amount / totalExpensesSum) * 100;
          if (pct > 40) signals.push({ icon: "payments", color: "text-on-surface-variant", text: `${top.category} คิดเป็น ${pct.toFixed(0)}% ของต้นทุน — หมวดนี้ควบคุมผล P&L มากที่สุด` });
        }
        if (cumulativeNet > 0 && revenueGrowth > 0 && signals.length === 0)
          signals.push({ icon: "check_circle", color: "text-primary", text: "กระแสเงินสดสะสมเป็นบวกและรายรับกำลังเติบโต — ธุรกิจดำเนินไปได้ดี" });
        if (signals.length === 0) return null;
        return (
          <div className="metric-card rounded-2xl overflow-hidden">
            <div className="px-5 pt-4 pb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">lightbulb</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">สิ่งที่ควรจับตา</h3>
            </div>
            <div className="px-5 pb-4 space-y-1">
              {signals.map((s, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b border-surface-container-low last:border-0">
                  <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${s.color}`}>{s.icon}</span>
                  <p className="font-body-md text-on-surface text-sm">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Monthly Goal ───────────────────────────────────── */}
      <MonthlyGoalCard
        monthKey={selectedMonth}
        actualIncome={report.totalIncome}
        actualExpense={report.totalExpenses}
        actualProfit={report.netProfit}
      />

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
              const meta = getCategoryMeta(category);
              return (
                <div key={category} className="p-4 rounded-xl bg-surface-container-low flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined ${meta.iconColor} text-[18px]`}>
                      {meta.icon}
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
        <div className="p-7 pb-0 flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface">รายการล่าสุด</h3>
          {selectedMonthTransactions.length > 5 && (
            <button
              onClick={() => { setShowAllTx((v) => !v); setTxFilter("all"); }}
              className="font-label-caps text-label-caps text-primary hover:underline transition-colors"
            >
              {showAllTx ? "แสดงน้อยลง" : "รายการทั้งหมด"}
            </button>
          )}
        </div>

        {showAllTx && (
          <div className="px-5 pt-3 flex gap-2">
            {(["all","income","expense"] as const).map((f) => (
              <button key={f} onClick={() => setTxFilter(f)}
                className={`px-3 py-1.5 rounded-full font-label-caps text-label-caps transition-colors ${
                  txFilter === f ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}>
                {f === "all" ? "ทั้งหมด" : f === "income" ? "รายรับ" : "รายจ่าย"}
              </button>
            ))}
          </div>
        )}

        {selectedMonthTransactions.length === 0 ? (
          <p className="px-7 py-10 text-center font-body-md text-on-surface-variant">ไม่มีรายการใน{monthLabel}</p>
        ) : (
          <div className="mt-4 divide-y divide-surface-container-low">
            {(showAllTx
              ? selectedMonthTransactions.filter(tx => txFilter === "all" || tx.type === txFilter)
              : selectedMonthTransactions.slice(0, 5)
            ).map((tx) => (
              showAllTx ? (
                <SwipeableRow
                  key={tx.id}
                  onEdit={() => setEditingTx({ id: tx.id, date: tx.date, type: tx.type, category: tx.category ?? "", amount: tx.amount, note: tx.description ?? "" })}
                  onDelete={() => setDeletingTxId(tx.id)}
                  className="border-b border-surface-container-low last:border-0"
                >
                  <div className="flex items-center gap-3 px-5 py-4 hover:bg-surface-container-low transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === "income" ? "bg-primary-container" : "bg-error-container"
                    }`}>
                      <span className={`material-symbols-outlined text-[18px] ${
                        tx.type === "income" ? "text-on-primary-container" : "text-on-error-container"
                      }`}>
                        {isPOS(tx) ? "point_of_sale" : tx.type === "income" ? "arrow_upward" : "arrow_downward"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-on-surface truncate">
                        {isPOS(tx) ? formatPosNote(tx.description ?? "", tx.category ?? "") : (tx.description || getCategoryLabel(tx.category))}
                      </p>
                      <p className="font-label-caps text-label-caps text-on-surface-variant">
                        {getCategoryLabel(tx.category)} · {formatTransactionDate(tx.date)}
                      </p>
                    </div>
                    <p className={`font-semibold text-sm whitespace-nowrap shrink-0 ${
                      tx.type === "income" ? "text-primary" : "text-error"
                    }`}>
                      {tx.type === "income" ? "+" : "-"}{formatBaht(tx.amount)}
                    </p>
                  </div>
                </SwipeableRow>
              ) : (
                <div key={tx.id} className="px-5 py-4 flex items-center gap-3 hover:bg-surface-container-low transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.type === "income" ? "bg-primary-container" : "bg-error-container"
                  }`}>
                    <span className={`material-symbols-outlined text-[18px] ${
                      tx.type === "income" ? "text-on-primary-container" : "text-on-error-container"
                    }`}>
                      {isPOS(tx) ? "point_of_sale" : tx.type === "income" ? "arrow_upward" : "arrow_downward"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-on-surface truncate">
                      {isPOS(tx) ? formatPosNote(tx.description ?? "", tx.category ?? "") : (tx.description || getCategoryLabel(tx.category))}
                    </p>
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
              )
            ))}
          </div>
        )}
      </div>

      <EditTransactionModal
        transaction={editingTx}
        onClose={() => setEditingTx(null)}
        onSaved={async () => { setEditingTx(null); await refreshTransactions(); }}
      />

      {/* BUG-005: in-app delete confirmation */}
      <ConfirmModal
        open={!!deletingTxId}
        title="ลบรายการ"
        message="ยืนยันการลบรายการนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        confirmLabel="ลบ"
        loading={deleteLoading}
        onCancel={() => setDeletingTxId(null)}
        onConfirm={async () => {
          if (!deletingTxId) return;
          setDeleteLoading(true);
          try {
            await deleteTransaction(deletingTxId);
            await refreshTransactions();
          } catch (e) {
            window.alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
          } finally {
            setDeleteLoading(false);
            setDeletingTxId(null);
          }
        }}
      />


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
