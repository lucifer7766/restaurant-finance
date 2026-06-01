"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import { useMonthFilter } from "@/context/MonthFilterContext";
import { filterTransactionsByMonth } from "@/lib/data";
import { formatMonthLabel, formatTransactionDate, getCategoryLabel } from "@/lib/utils";

function formatBaht(amount: number) {
  return `฿${Number(amount || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

const PAYMENT_METHODS = [
  { key: "เงินสด", icon: "payments", color: "bg-error-container", iconColor: "text-error" },
  { key: "โอนเงิน", icon: "account_balance", color: "bg-primary-container", iconColor: "text-on-primary-container" },
  { key: "บัตรเครดิต", icon: "credit_card", color: "bg-tertiary-container", iconColor: "text-on-tertiary-fixed-variant" },
];

const INCOME_CATEGORIES = [
  { key: "ยอดขายอาหาร", label: "ยอดขายอาหาร", sublabel: "DINE-IN & TAKEAWAY", icon: "restaurant" },
  { key: "ยอดขายเครื่องดื่ม", label: "ยอดขายเครื่องดื่ม", sublabel: "SOFT DRINKS & BAR", icon: "local_bar" },
  { key: "เดลิเวอรี", label: "เดลิเวอรี", sublabel: "GRAB, LINEMAN, SHOPEE", icon: "delivery_dining" },
];

export function IncomeContent() {
  const { transactions, isLoading, error } = useTransactions();
  const { selectedMonth } = useMonthFilter();

  const monthLabel = formatMonthLabel(selectedMonth);

  const allIncome = useMemo(
    () => transactions.filter((t) => t.type === "income"),
    [transactions]
  );

  const monthIncome = useMemo(
    () => filterTransactionsByMonth(allIncome, selectedMonth),
    [allIncome, selectedMonth]
  );

  const totalIncome = useMemo(
    () => monthIncome.reduce((s, t) => s + t.amount, 0),
    [monthIncome]
  );

  /* เฉลี่ยต่อวัน */
  const daysInMonth = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  }, [selectedMonth]);
  const dailyAvg = daysInMonth > 0 ? totalIncome / daysInMonth : 0;

  /* ช่องทางชำระเงิน (derive from category keyword) */
  const paymentBreakdown = useMemo(() => {
    return PAYMENT_METHODS.map(({ key }) => ({
      key,
      amount: monthIncome
        .filter((t) => (t.category || "").includes(key) || (t.description || "").includes(key))
        .reduce((s, t) => s + t.amount, 0),
    }));
  }, [monthIncome]);

  /* หมวดหมู่ */
  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    monthIncome.forEach((t) => {
      const cat = t.category || "อื่นๆ";
      totals[cat] = (totals[cat] ?? 0) + t.amount;
    });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount }));
  }, [monthIncome]);


  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-0.5">
          รายรับ
        </h2>
        <p className="font-label-caps text-label-caps text-on-surface-variant">{monthLabel}</p>
      </div>

      {/* ── Action buttons ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/income/new" className="btn-primary flex-1 text-center">
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          เพิ่มรายรับ
        </Link>
        <button className="btn-secondary flex-1" disabled>
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          สัปโหลดรายงาน POS
        </button>
      </div>

      {error && (
        <div className="sand-card p-4 rounded-xl flex items-center gap-3 border-l-4 border-error">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-on-surface">{error}</p>
        </div>
      )}

      {/* ── Total Income ───────────────────────────────────── */}
      {isLoading ? (
        <div className="metric-card rounded-2xl p-7 animate-pulse">
          <div className="h-3 bg-surface-container-highest rounded w-1/3 mb-5" />
          <div className="h-14 bg-surface-container-highest rounded w-2/3" />
        </div>
      ) : (
        <div className="metric-card p-7 rounded-2xl">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3 uppercase tracking-widest">
            Total Income This Month
          </span>
          <div className="flex items-baseline gap-2 text-primary">
            <span className="text-3xl font-bold opacity-60">฿</span>
            <span className="font-display-currency text-display-currency tracking-tight leading-none">
              {totalIncome.toLocaleString("th-TH")}
            </span>
          </div>
        </div>
      )}

      {/* ── Payment Method Breakdown ────────────────────────── */}
      {!isLoading && (
        <div className="space-y-3">
          {PAYMENT_METHODS.map(({ key, icon, color, iconColor }) => {
            const item = paymentBreakdown.find((p) => p.key === key);
            const amount = item?.amount ?? 0;
            const pct = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
            return (
              <div key={key} className="metric-card p-5 rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                    <span className={`material-symbols-outlined text-[18px] ${iconColor}`}>{icon}</span>
                  </div>
                  <span className="font-body-md text-on-surface">{key}</span>
                </div>
                <div className="flex items-baseline gap-1 text-on-surface mb-2">
                  <span className="text-sm font-bold opacity-60">฿</span>
                  <span className="text-2xl font-bold font-headline-md tracking-tight">
                    {amount.toLocaleString("th-TH")}
                  </span>
                </div>
                <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}

          {/* เฉลี่ยต่อวัน */}
          <div className="metric-card p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary-container text-[18px]">trending_up</span>
              </div>
              <span className="font-body-md text-on-surface">เฉลี่ยต่อวัน</span>
            </div>
            <div className="flex items-baseline gap-1 text-on-surface">
              <span className="text-sm font-bold opacity-60">฿</span>
              <span className="text-2xl font-bold font-headline-md tracking-tight">
                {Math.round(dailyAvg).toLocaleString("th-TH")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── สัดส่วนรายรับตามหมวดหมู่ ───────────────────────── */}
      {!isLoading && categoryBreakdown.length > 0 && (
        <div className="metric-card p-6 rounded-2xl">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-4">
            สัดส่วนรายรับตามหมวดหมู่
          </h3>
          <div className="space-y-3">
            {categoryBreakdown.map(({ category, amount }) => {
              const ref = INCOME_CATEGORIES.find((c) => category.includes(c.key) || c.key.includes(category));
              const icon = ref?.icon ?? "sell";
              const sublabel = ref?.sublabel ?? "";
              return (
                <div key={category} className="p-4 rounded-xl bg-surface-container-low flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-primary-container text-[18px]">{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-on-surface">{getCategoryLabel(category)}</p>
                    {sublabel && <p className="font-label-caps text-label-caps text-on-surface-variant">{sublabel}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-price-table text-price-table text-on-surface">{formatBaht(amount)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── รายการล่าสุด ────────────────────────────────────── */}
      <div className="metric-card rounded-2xl overflow-hidden">
        <div className="p-6 pb-0 flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface">รายการล่าสุด</h3>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[20px]">filter_list</span>
            </button>
            <button className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>
          </div>
        </div>
        {isLoading ? (
          <p className="px-6 py-10 text-center font-body-md text-on-surface-variant">กำลังโหลด...</p>
        ) : monthIncome.length === 0 ? (
          <p className="px-6 py-10 text-center font-body-md text-on-surface-variant">ไม่มีรายรับใน{monthLabel}</p>
        ) : (
          <>
            <div className="mt-5">
              <div className="px-6 py-2 grid grid-cols-3 border-b border-surface-container-low">
                <span className="font-label-caps text-label-caps text-on-surface-variant">วันที่</span>
                <span className="font-label-caps text-label-caps text-on-surface-variant">หมวดหมู่</span>
                <span className="font-label-caps text-label-caps text-on-surface-variant text-right">จำนวน</span>
              </div>
              <div className="divide-y divide-surface-container-low">
                {monthIncome.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="px-6 py-4 grid grid-cols-3 items-center hover:bg-surface-container-low transition-colors">
                    <div>
                      <p className="font-label-caps text-label-caps text-on-surface-variant">{formatTransactionDate(tx.date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-on-primary-container text-[14px]">restaurant</span>
                      </div>
                      <span className="font-body-md text-on-surface text-sm truncate">{getCategoryLabel(tx.category)}</span>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container">
                        <span className="font-label-caps text-label-caps text-on-primary-container">โอนเงิน</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 border-t border-surface-container-low">
              <button className="w-full text-center py-3 rounded-xl bg-surface-container font-body-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
                ดูรายการทั้งหมด
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
