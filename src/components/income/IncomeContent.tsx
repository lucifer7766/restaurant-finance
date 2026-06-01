"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import EditTransactionModal from "@/components/transactions/EditTransactionModal";
import { PosImportModal, type PosGroup } from "@/components/income/PosImportModal";
import { PosImportHistory, type ImportBatch } from "@/components/income/PosImportHistory";
import { updateTransaction } from "@/lib/supabase/transactions";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useMonthFilter } from "@/context/MonthFilterContext";
import { filterTransactionsByMonth } from "@/lib/data";
import { formatMonthLabel, formatTransactionDate, getCategoryLabel } from "@/lib/utils";

function getPrevMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatBaht(amount: number) {
  return `฿${Number(amount || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

const INCOME_META: Record<string, { icon: string; bg: string; iconColor: string }> = {
  ยอดขายอาหาร:      { icon: "restaurant",      bg: "bg-surface-container-high", iconColor: "text-on-surface-variant" },
  ยอดขายเครื่องดื่ม: { icon: "local_bar",       bg: "bg-error-container",        iconColor: "text-error" },
  เดลิเวอรี:         { icon: "delivery_dining", bg: "bg-surface-container-high", iconColor: "text-on-surface-variant" },
  จัดเลี้ยง:         { icon: "event",           bg: "bg-primary-container",      iconColor: "text-on-primary-container" },
};

function getIncomeMeta(category: string) {
  const key = Object.keys(INCOME_META).find((k) => category.includes(k));
  return key ? INCOME_META[key] : { icon: "sell", bg: "bg-surface-container-high", iconColor: "text-on-surface-variant" };
}

const PAYMENT_METHODS = [
  { key: "เงินสด",    icon: "payments",         bg: "bg-error-container",    iconColor: "text-error",                       barColor: "bg-error" },
  { key: "โอนเงิน",   icon: "account_balance",   bg: "bg-primary-container",  iconColor: "text-on-primary-container",        barColor: "bg-primary" },
  { key: "บัตรเครดิต", icon: "credit_card",       bg: "bg-tertiary-container", iconColor: "text-on-tertiary-fixed-variant",   barColor: "bg-tertiary" },
];

const PAGE_SIZE = 10;

const POS_PREFIX = "POS_IMPORT_";
const LEGACY_POS_MARKER = "POS Import:"; // format เก่าก่อนมี batch ID
const LEGACY_BATCH_ID = "__LEGACY_POS__";

function parseBatchId(description: string): string | null {
  if (description.startsWith(POS_PREFIX)) return description.split(" | ")[0].trim();
  if (description.startsWith(LEGACY_POS_MARKER)) return LEGACY_BATCH_ID;
  return null;
}

export function IncomeContent() {
  const { transactions, isLoading, error, addTransaction, deleteTransaction, refreshTransactions } = useTransactions();
  const [posModalOpen, setPosModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { selectedMonth } = useMonthFilter();

  const searchParams = useSearchParams();
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { if (searchParams.get("view") === "all") setShowAll(true); }, [searchParams]);
  const [activeTab, setActiveTab] = useState("ทั้งหมด");
  const [page, setPage] = useState(0);
  const [editingTx, setEditingTx] = useState<Parameters<typeof EditTransactionModal>[0]["transaction"]>(null);

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

  const daysInMonth = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  }, [selectedMonth]);
  const dailyAvg = daysInMonth > 0 ? totalIncome / daysInMonth : 0;

  const importBatches = useMemo((): ImportBatch[] => {
    const map = new Map<string, ImportBatch>();
    for (const t of allIncome) {
      const batchId = parseBatchId(t.description || "");
      if (!batchId) continue;
      const isLegacy = batchId === LEGACY_BATCH_ID;
      const ts = isLegacy ? 0 : parseInt(batchId.replace(POS_PREFIX, ""), 10);
      const importedAt = isNaN(ts) || ts === 0 ? new Date(0) : new Date(ts);
      const existing = map.get(batchId);
      const tx = { id: t.id, date: t.date, category: t.category, amount: t.amount, description: t.description };
      if (existing) {
        existing.transactions.push(tx);
        existing.totalAmount += t.amount;
      } else {
        map.set(batchId, { batchId, importedAt, transactions: [tx], totalAmount: t.amount, isLegacy });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.importedAt.getTime() - a.importedAt.getTime());
  }, [allIncome]);

  const prevMonthIncome = useMemo(
    () => filterTransactionsByMonth(allIncome, getPrevMonth(selectedMonth)),
    [allIncome, selectedMonth]
  );

  const prevTotalIncome = useMemo(
    () => prevMonthIncome.reduce((s, t) => s + t.amount, 0),
    [prevMonthIncome]
  );

  const paymentBreakdown = useMemo(() => {
    return PAYMENT_METHODS.map(({ key }) => {
      const amount = monthIncome
        .filter((t) => (t.category || "").includes(key) || (t.description || "").includes(key))
        .reduce((s, t) => s + t.amount, 0);
      const prevAmount = prevMonthIncome
        .filter((t) => (t.category || "").includes(key) || (t.description || "").includes(key))
        .reduce((s, t) => s + t.amount, 0);
      return { key, amount, prevAmount };
    });
  }, [monthIncome, prevMonthIncome]);

  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    monthIncome.forEach((t) => {
      const cat = t.category || "อื่นๆ";
      totals[cat] = (totals[cat] ?? 0) + t.amount;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }));
  }, [monthIncome]);

  const tabCategories = useMemo(
    () => ["ทั้งหมด", ...categoryBreakdown.slice(0, 3).map((c) => c.category)],
    [categoryBreakdown]
  );

  const filteredIncome = useMemo(() => {
    if (activeTab === "ทั้งหมด") return monthIncome;
    return monthIncome.filter((t) => t.category === activeTab);
  }, [monthIncome, activeTab]);

  const totalPages = Math.ceil(filteredIncome.length / PAGE_SIZE);
  const pagedIncome = filteredIncome.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    setPage(0);
  }

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-on-surface-variant tracking-normal mb-1">
          แดชบอร์ดรายรับ
        </p>
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">
          รายงานรายรับประจำเดือน
        </h2>
        <p className="font-body-md text-on-surface-variant">
          ตรวจสอบและติดตามรายรับของ PLU Bistro อย่างเป็นระบบ
        </p>
      </div>

      {/* ── Action buttons ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/income/new" className="btn-primary flex-1 text-center">
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          เพิ่มรายรับ
        </Link>
        <button onClick={() => setPosModalOpen(true)} className="btn-secondary flex-1">
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          อัปโหลดรายงาน POS
        </button>
      </div>
      {importBatches.length > 0 && (
        <button
          onClick={() => setHistoryOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">history</span>
            <span className="font-body-md text-on-surface text-sm">ประวัติการนำเข้า POS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-on-surface-variant">{importBatches.length} รายงาน</span>
            <span className="material-symbols-outlined text-on-surface-variant text-[16px]">chevron_right</span>
          </div>
        </button>
      )}

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
          <span className="text-xs font-medium text-on-surface-variant block mb-4 tracking-normal">
            รายรับรวมเดือนนี้
          </span>
          <div className="flex items-baseline gap-2 text-primary">
            <span className="text-4xl font-bold opacity-50">฿</span>
            <span className="font-display-currency text-display-currency tracking-tight leading-none">
              {totalIncome.toLocaleString("th-TH")}
            </span>
          </div>
        </div>
      )}

      {/* ── Payment Method Breakdown ────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="metric-card rounded-2xl p-7 animate-pulse">
              <div className="h-3 bg-surface-container-highest rounded w-1/3 mb-5" />
              <div className="h-12 bg-surface-container-highest rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {PAYMENT_METHODS.map(({ key, icon, bg, iconColor }) => {
            const item = paymentBreakdown.find((p) => p.key === key);
            const amount = item?.amount ?? 0;
            const prevAmount = item?.prevAmount ?? 0;
            const pct = totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0;
            const hasPrev = prevAmount > 0;
            const trend = hasPrev ? Math.round(((amount - prevAmount) / prevAmount) * 100) : 0;
            return (
              <div key={key} className="metric-card p-6 rounded-2xl">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                    <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>{icon}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium tracking-normal text-on-surface-variant">{pct}% ของรายรับทั้งหมด</p>
                    {hasPrev && (
                      <p className={`text-xs font-medium tracking-normal ${trend >= 0 ? "text-primary" : "text-error"}`}>
                        {trend >= 0 ? "+" : ""}{trend}% จากเดือนก่อน
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm font-medium text-on-surface-variant mb-1">{key}</p>
                <div className="flex items-baseline gap-1 text-on-surface">
                  <span className="text-base font-bold opacity-50">฿</span>
                  <span className="text-3xl font-bold font-headline-md tracking-tight">
                    {amount.toLocaleString("th-TH")}
                  </span>
                </div>
              </div>
            );
          })}

          {/* เฉลี่ยต่อวัน */}
          <div className="metric-card p-6 rounded-2xl">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary-container text-[20px]">trending_up</span>
              </div>
              <span className="text-xs font-medium tracking-normal text-on-surface-variant">รายวัน</span>
            </div>
            <p className="text-sm font-medium text-on-surface-variant mb-1">เฉลี่ยต่อวัน</p>
            <div className="flex items-baseline gap-1 text-on-surface">
              <span className="text-base font-bold opacity-50">฿</span>
              <span className="text-3xl font-bold font-headline-md tracking-tight">
                {Math.round(dailyAvg).toLocaleString("th-TH")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── สัดส่วนรายรับตามหมวดหมู่ ───────────────────────── */}
      {!isLoading && categoryBreakdown.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-headline-md text-headline-md text-on-surface">สัดส่วนรายรับตามหมวดหมู่</h3>
          {categoryBreakdown.map(({ category, amount }) => {
            const meta = getIncomeMeta(category);
            return (
              <div key={category} className="metric-card p-5 rounded-2xl flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                  <span className={`material-symbols-outlined text-[20px] ${meta.iconColor}`}>{meta.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-on-surface">{getCategoryLabel(category)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-price-table text-price-table text-primary">{formatBaht(amount)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── รายการล่าสุด / รายการทั้งหมด ───────────────────── */}
      <div className="metric-card rounded-2xl overflow-hidden">
        <div className="p-6 pb-0 flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface">
            {showAll ? "รายการทั้งหมด" : "รายการล่าสุด"}
          </h3>
          {showAll ? (
            <button
              onClick={() => setShowAll(false)}
              className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              ย้อนกลับ
            </button>
          ) : (
            <button
              onClick={() => setShowAll(true)}
              className="font-label-caps text-label-caps text-primary hover:underline transition-colors"
            >
              ดูทั้งหมด
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="px-6 py-10 text-center font-body-md text-on-surface-variant">กำลังโหลด...</p>
        ) : monthIncome.length === 0 ? (
          <p className="px-6 py-10 text-center font-body-md text-on-surface-variant">ไม่มีรายรับใน{monthLabel}</p>
        ) : !showAll ? (
          /* ── Recent (no edit/delete) ── */
          <div className="mt-4 divide-y divide-surface-container-low">
            {monthIncome.slice(0, 5).map((tx) => {
              const meta = getIncomeMeta(tx.category || "");
              return (
                <div key={tx.id} className="px-5 py-4 grid grid-cols-[auto_1fr_auto] gap-x-3 items-center hover:bg-surface-container-low transition-colors">
                  <div className="min-w-[56px]">
                    <p className="font-label-caps text-label-caps text-on-surface leading-snug">
                      {formatTransactionDate(tx.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                      <span className={`material-symbols-outlined text-[16px] ${meta.iconColor}`}>{meta.icon}</span>
                    </div>
                    <span className="font-body-md text-on-surface text-sm leading-tight truncate">
                      {tx.description || getCategoryLabel(tx.category)}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm text-primary whitespace-nowrap">
                      +{formatBaht(tx.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Full list (with edit/delete + tabs + pagination) ── */
          <>
            <div className="px-4 py-3 flex gap-2 overflow-x-auto border-b border-surface-container-low mt-2">
              {tabCategories.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-3 py-1.5 rounded-full font-label-caps text-label-caps shrink-0 transition-colors ${
                    activeTab === tab
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {getCategoryLabel(tab)}
                </button>
              ))}
            </div>
            <div className="divide-y divide-surface-container-low">
              {pagedIncome.map((tx) => {
                const meta = getIncomeMeta(tx.category || "");
                return (
                  <div key={tx.id} className="overflow-x-auto scrollbar-none hover:bg-surface-container-low transition-colors">
                    <div className="flex items-center">
                      <div className="grid grid-cols-[52px_1fr_auto] gap-x-3 items-center px-4 py-4 w-full shrink-0">
                        <p className="font-label-caps text-label-caps text-on-surface leading-tight">
                          {formatTransactionDate(tx.date)}
                        </p>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                            <span className={`material-symbols-outlined text-[14px] ${meta.iconColor}`}>{meta.icon}</span>
                          </div>
                          <span className="font-body-md text-on-surface text-sm leading-tight truncate">
                            {tx.description || getCategoryLabel(tx.category)}
                          </span>
                        </div>
                        <p className="font-semibold text-sm text-primary whitespace-nowrap text-right">
                          +{formatBaht(tx.amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 px-3 border-l border-surface-container-low shrink-0">
                        <button
                          onClick={() => setEditingTx({ id: tx.id, date: tx.date, type: tx.type, category: tx.category ?? "", amount: tx.amount, note: tx.description ?? "" })}
                          className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm("ลบรายการนี้?")) return;
                            try { await deleteTransaction(tx.id); }
                            catch (e) { alert(e instanceof Error ? e.message : "ลบไม่สำเร็จ"); }
                          }}
                          className="p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-5 border-t border-surface-container-low flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredIncome.length)} of {filteredIncome.length}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="p-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── POS Import History Drawer ────────────────────── */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
          <div className="w-full sm:max-w-lg bg-surface sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92dvh]">
            <div className="px-6 pt-6 pb-4 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 bg-surface-container-high rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">history</span>
              </div>
              <div className="flex-1">
                <h3 className="font-headline-md text-headline-md text-on-surface">ประวัติการนำเข้า POS</h3>
                <p className="font-label-caps text-label-caps text-on-surface-variant">{importBatches.length} รายงาน</p>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="p-2 rounded-xl hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 pb-6">
              <PosImportHistory
                batches={importBatches}
                onDelete={async (batchId) => {
                  console.log("[POS Delete] batchId:", batchId);
                  const supabase = getSupabaseClient();

                  // 1. query หา records จาก note field จริงใน DB
                  const { data: found, error: findError } = await supabase
                    .from("transactions")
                    .select("id")
                    .ilike("note", `%${batchId}%`);

                  if (findError) {
                    console.error("[POS Delete] find error:", findError);
                    throw new Error(findError.message);
                  }

                  const ids = (found ?? []).map((r: { id: string }) => r.id);
                  console.log("[POS Delete] records found:", ids.length, ids);

                  if (ids.length === 0) throw new Error("ไม่พบรายการรายรับของ import นี้");

                  // 2. delete ทีเดียว
                  const { error: delError } = await supabase
                    .from("transactions")
                    .delete()
                    .in("id", ids);

                  if (delError) {
                    console.error("[POS Delete] delete error:", delError);
                    throw new Error(delError.message);
                  }

                  console.log("[POS Delete] deleted", ids.length, "records");
                  await refreshTransactions();
                }}
                onEdit={async (_batchId, updates) => {
                  for (const u of updates) {
                    await updateTransaction(u.id, { date: u.date, category: u.category, amount: u.amount });
                  }
                  await refreshTransactions();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Transaction Modal ────────────────────────── */}
      <EditTransactionModal
        transaction={editingTx}
        onClose={() => setEditingTx(null)}
        onSaved={async () => { setEditingTx(null); await refreshTransactions(); }}
      />

      {/* ── POS Import Modal ──────────────────────────────── */}
      <PosImportModal
        open={posModalOpen}
        onClose={() => setPosModalOpen(false)}
        onConfirm={async (groups: PosGroup[]) => {
          if (groups.length === 0) throw new Error("ไม่มีข้อมูลให้บันทึก");
          const batchId = `${POS_PREFIX}${Date.now()}`;
          for (const g of groups) {
            await addTransaction({
              date: g.date,
              type: "income" as const,
              category: g.category,
              amount: g.amount,
              note: `${batchId} | ${g.category} | รวม ${g.count} รายการ`,
            });
          }
          await refreshTransactions();
        }}
      />

    </div>
  );
}
