"use client";

import { useMemo } from "react";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import { useMonthFilter } from "@/context/MonthFilterContext";
import {
  getMonthlyReportFromTransactions,
  filterTransactionsByMonth,
} from "@/lib/data";
import { formatMonthLabel, formatCompactNumber } from "@/lib/utils";

function formatMoney(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getPrevMonths(currentMonth: string, count: number): string[] {
  const months: string[] = [];
  let [y, m] = currentMonth.split("-").map(Number);
  for (let i = 0; i < count; i++) {
    months.unshift(`${y}-${String(m).padStart(2, "0")}`);
    m--;
    if (m === 0) { m = 12; y--; }
  }
  return months;
}

const CATEGORY_COLORS = [
  "var(--color-primary)",
  "var(--color-tertiary-container)",
  "var(--color-error)",
  "var(--color-secondary-container)",
  "var(--color-primary-fixed-dim)",
  "var(--color-on-primary-container)",
];

/* ─── CostAnalysisContent ─────────────────────────────────────────────────── */

export function CostAnalysisContent() {
  const { transactions, isLoading, error: loadError } = useTransactions();
  const { selectedMonth } = useMonthFilter();

  const last6Months = useMemo(() => getPrevMonths(selectedMonth, 6), [selectedMonth]);

  /* Current month expense breakdown */
  const currentReport = useMemo(
    () => getMonthlyReportFromTransactions(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  /* Top categories across 6 months (by total) */
  const topCategories = useMemo(() => {
    const totals: Record<string, number> = {};
    last6Months.forEach((month) => {
      const r = getMonthlyReportFromTransactions(transactions, month);
      r.expenseBreakdown.forEach(({ category, amount }) => {
        totals[category] = (totals[category] ?? 0) + amount;
      });
    });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([category]) => category);
  }, [transactions, last6Months]);

  /* 6-month data per category */
  const chartData = useMemo(() => {
    return last6Months.map((month) => {
      const r = getMonthlyReportFromTransactions(transactions, month);
      const byCategory: Record<string, number> = {};
      r.expenseBreakdown.forEach(({ category, amount }) => {
        byCategory[category] = amount;
      });
      const total = topCategories.reduce((s, c) => s + (byCategory[c] ?? 0), 0);
      return { month, byCategory, total };
    });
  }, [transactions, last6Months, topCategories]);

  /* Summary stats for current month */
  const currentMonthTxns = useMemo(
    () => filterTransactionsByMonth(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const totalExpense = currentReport.totalExpenses;
  const totalIncome = currentReport.totalIncome;
  const costRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

  /* ── Insight alerts (derived from data) ────────────────── */
  const topCat = currentReport.expenseBreakdown[0];
  const topCatPct = topCat && totalExpense > 0 ? (topCat.amount / totalExpense) * 100 : 0;

  /* ── Loading ────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="metric-card rounded-2xl p-7 animate-pulse">
            <div className="h-3 bg-surface-container-highest rounded w-1/3 mb-6" />
            <div className="h-10 bg-surface-container-highest rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  /* ── JSX ────────────────────────────────────────────────── */
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
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-0.5">
          วิเคราะห์ต้นทุน
        </h2>
        <p className="font-label-caps text-label-caps text-on-surface-variant">
          สรุปข้อมูลค่าใช้จ่ายและข้อเสนอแนะประจำเดือน {formatMonthLabel(selectedMonth)}
        </p>
      </div>

      {/* ── Insight alert cards ────────────────────────────── */}
      {!topCat && !isLoading && (
        <div className="metric-card p-5 rounded-2xl flex items-center gap-4">
          <span className="material-symbols-outlined text-on-surface-variant text-[28px]">analytics</span>
          <p className="font-body-md text-on-surface-variant">ยังไม่มีข้อมูลค่าใช้จ่ายสำหรับ{formatMonthLabel(selectedMonth)}</p>
        </div>
      )}
      {topCat && (
        <div className="space-y-3">
          {/* Alert 1: Top expense category */}
          <div className="metric-card p-5 rounded-2xl flex items-start gap-4 border-l-4 border-error">
            <div className="w-10 h-10 bg-error-container rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-error text-[20px]">warning</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-caps text-label-caps text-error">ต้นทุนสูงสุด</span>
                <span className="font-label-caps text-label-caps text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                  {topCatPct.toFixed(0)}% ของต้นทุนทั้งหมด
                </span>
              </div>
              <p className="font-body-md text-on-surface font-semibold">{topCat.category}</p>
              <p className="font-label-caps text-label-caps text-on-surface-variant mt-0.5">
                ฿{formatMoney(topCat.amount)} เดือนนี้
              </p>
            </div>
          </div>

          {/* Alert 2: Cost ratio */}
          <div className={`metric-card p-5 rounded-2xl flex items-start gap-4 border-l-4 ${
            costRatio > 70 ? "border-error" : costRatio > 50 ? "border-tertiary" : "border-primary"
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              costRatio > 70 ? "bg-error-container" : "bg-primary-container"
            }`}>
              <span className={`material-symbols-outlined text-[20px] ${
                costRatio > 70 ? "text-error" : "text-on-primary-container"
              }`}>
                {costRatio > 70 ? "trending_up" : "check_circle"}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className={`font-label-caps text-label-caps ${costRatio > 70 ? "text-error" : "text-primary"}`}>
                  สัดส่วนต้นทุน
                </span>
              </div>
              <p className="font-body-md text-on-surface font-semibold">{costRatio.toFixed(1)}% ของรายรับ</p>
              <p className="font-label-caps text-label-caps text-on-surface-variant mt-0.5">
                {costRatio > 70
                  ? "ต้นทุนสูงเกินไป ควรลดค่าใช้จ่ายที่ไม่จำเป็น"
                  : costRatio > 50
                  ? "ต้นทุนพอสมควร ยังมีพื้นที่ปรับปรุง"
                  : totalIncome > 0
                  ? "ต้นทุนอยู่ในระดับดี รักษาไว้"
                  : "ยังไม่มีรายรับเดือนนี้"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Summary metric row ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="metric-card p-5 rounded-2xl">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-2">ต้นทุนรวม</span>
          <div className="flex items-baseline gap-1 text-on-surface">
            <span className="text-base font-bold opacity-60">฿</span>
            <span className="text-2xl font-bold font-headline-md tracking-tight">{formatMoney(totalExpense)}</span>
          </div>
        </div>
        <div className="metric-card p-5 rounded-2xl">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-2">รายรับ</span>
          <div className="flex items-baseline gap-1 text-primary">
            <span className="text-base font-bold opacity-60">฿</span>
            <span className="text-2xl font-bold font-headline-md tracking-tight">{formatMoney(totalIncome)}</span>
          </div>
        </div>
        <div className="metric-card p-5 rounded-2xl">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-2">สัดส่วนต้นทุน</span>
          <span className={`text-2xl font-bold font-headline-md tracking-tight ${costRatio > 70 ? "text-error" : "text-primary"}`}>
            {costRatio.toFixed(1)}%
          </span>
        </div>
        <div className="metric-card p-5 rounded-2xl">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-2">หมวดค่าใช้จ่าย</span>
          <div className="flex items-baseline gap-1 text-on-surface">
            <span className="text-2xl font-bold font-headline-md">{currentReport.expenseBreakdown.length}</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant ml-1">หมวด</span>
          </div>
        </div>
      </div>

      {/* ── 6-Month Grouped Bar Chart ───────────────────────── */}
      <div className="metric-card p-7 rounded-2xl">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-1">เปรียบเทียบต้นทุน 6 เดือน</h3>
        <p className="font-label-caps text-label-caps text-on-surface-variant mb-5">ต้นทุนแยกตามหมวดหมู่</p>

        {topCategories.length === 0 ? (
          <p className="py-16 font-body-md text-on-surface-variant text-center">ยังไม่มีข้อมูลค่าใช้จ่าย</p>
        ) : (
          <>
            <SixMonthGroupedChart
              chartData={chartData}
              topCategories={topCategories}
            />
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
              {topCategories.map((cat, i) => (
                <div key={cat} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  <span className="font-label-caps text-label-caps text-on-surface-variant">{cat}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── สัดส่วนค่าใช้จ่าย ──────────────────────────────── */}
      {currentReport.expenseBreakdown.length > 0 && (
        <div className="metric-card p-7 rounded-2xl">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-5">สัดส่วนค่าใช้จ่าย</h3>
          <div className="space-y-4">
            {currentReport.expenseBreakdown.map(({ category, amount }, i) => {
              const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
              const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--color-surface-container-high)" }}>
                        <span className="material-symbols-outlined text-[16px]" style={{ color }}>{getCategoryIcon(category)}</span>
                      </div>
                      <span className="font-body-md text-on-surface">{category}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-price-table text-price-table text-on-surface">฿{formatMoney(amount)}</span>
                      <span className="font-label-caps text-label-caps text-on-surface-variant ml-2">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recommendation box ─────────────────────────────── */}
      {topCat && (
        <div className="sand-card-light p-6 rounded-2xl flex items-start gap-4">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[18px]">lightbulb</span>
          </div>
          <div>
            <p className="font-body-md text-on-surface font-semibold mb-1">ข้อแนะนำประจำเดือนนี้</p>
            <p className="font-body-md text-on-surface-variant">
              {costRatio > 70
                ? `ต้นทุนของคุณสูงถึง ${costRatio.toFixed(0)}% ของรายรับ ควรเริ่มลด${topCat.category}ก่อนเป็นอันดับแรก`
                : `รักษาสัดส่วนต้นทุนไว้ที่ ${costRatio.toFixed(0)}% และพิจารณาเพิ่มยอดขายจากช่องทางที่มีต้นทุนต่ำ`}
            </p>
            {totalExpense > 0 && (
              <p className="font-label-caps text-label-caps text-on-surface-variant mt-2">
                ค่าใช้จ่ายเฉลี่ยต่อวัน ฿{formatMoney(Math.round(totalExpense / 30))} / วัน
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

/* ─── SixMonthGroupedChart (grouped bars per month) ─────────────────────── */

function SixMonthGroupedChart({
  chartData,
  topCategories,
}: {
  chartData: Array<{ month: string; byCategory: Record<string, number>; total: number }>;
  topCategories: string[];
}) {
  const allValues = chartData.flatMap((d) => topCategories.map((c) => d.byCategory[c] ?? 0));
  const maxVal = Math.max(...allValues, 1);
  const paddedMax = Math.ceil(maxVal / 10000) * 10000 || 10000;

  const CHART_H = 200;
  const PAD = { top: 16, right: 10, bottom: 36, left: 52 };
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const innerW = 320;
  const totalW = innerW + PAD.left + PAD.right;
  const groupW = innerW / chartData.length;
  const barCount = topCategories.length;
  const barW = Math.min((groupW * 0.7) / barCount, 20);
  const groupGap = barW * 0.2;
  const yTicks = Array.from({ length: 5 }, (_, i) => (paddedMax / 4) * i);
  const baseY = PAD.top + innerH;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} ${CHART_H}`}
        className="w-full min-w-[320px]"
        style={{ height: `${CHART_H + 8}px` }}
        role="img"
        aria-label="6-month grouped cost chart"
      >
        {yTicks.map((tick) => {
          const y = PAD.top + innerH - (tick / paddedMax) * innerH;
          return (
            <g key={tick}>
              <line x1={PAD.left} y1={y} x2={totalW - PAD.right} y2={y}
                stroke="currentColor" strokeOpacity={0.07} vectorEffect="non-scaling-stroke" />
              <text x={PAD.left - 4} y={y + 0.8} textAnchor="end" dominantBaseline="middle"
                className="fill-zinc-400" style={{ fontSize: "8px" }}>
                {formatCompactNumber(tick)}
              </text>
            </g>
          );
        })}

        {chartData.map((d, gi) => {
          const groupCenterX = PAD.left + groupW * gi + groupW / 2;
          const totalBarsW = barCount * barW + (barCount - 1) * groupGap;
          const startX = groupCenterX - totalBarsW / 2;

          return (
            <g key={d.month}>
              {topCategories.map((cat, ci) => {
                const amount = d.byCategory[cat] ?? 0;
                const barH = amount > 0 ? Math.max((amount / paddedMax) * innerH, 2) : 0;
                const x = startX + ci * (barW + groupGap);
                return (
                  <rect key={cat} x={x} y={baseY - barH} width={barW} height={barH}
                    fill={CATEGORY_COLORS[ci % CATEGORY_COLORS.length]} rx={1.5}>
                    <title>{`${cat} ${d.month}: ฿${formatMoney(amount)}`}</title>
                  </rect>
                );
              })}
              <text x={groupCenterX} y={baseY + 12} textAnchor="middle"
                className="fill-zinc-400" style={{ fontSize: "8px" }}>
                {["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."][Number(d.month.slice(5)) - 1]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function getCategoryIcon(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes("วัตถุดิบ") || lower.includes("อาหาร") || lower.includes("food") || lower.includes("ingredient")) return "grocery";
  if (lower.includes("แรง") || lower.includes("เงินเดือน") || lower.includes("labor") || lower.includes("salary")) return "groups";
  if (lower.includes("เช่า") || lower.includes("rent")) return "home";
  if (lower.includes("ไฟ") || lower.includes("น้ำ") || lower.includes("utility") || lower.includes("electric")) return "electric_bolt";
  if (lower.includes("การตลาด") || lower.includes("marketing") || lower.includes("โฆษณา")) return "campaign";
  if (lower.includes("ซ่อม") || lower.includes("maintenance")) return "build";
  if (lower.includes("บรรจุ") || lower.includes("packaging")) return "package_2";
  return "receipt_long";
}
