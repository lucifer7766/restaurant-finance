"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import EditTransactionModal from "@/components/transactions/EditTransactionModal";
import { PosImportModal, type PosGroup, type PaymentBreakdown } from "@/components/income/PosImportModal";
import { PosImportHistory, EditBatchModal, DeleteConfirmModal, type ImportBatch } from "@/components/income/PosImportHistory";
import { updateTransaction, deleteTransaction as deleteTransactionFromSupabase } from "@/lib/supabase/transactions";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import { useMonthFilter } from "@/context/MonthFilterContext";
import { filterTransactionsByMonth, getMonthlyReportFromTransactions } from "@/lib/data";
import { formatMonthLabel, formatTransactionDate, getCategoryLabel, formatPosNote, getCategoryMeta } from "@/lib/utils";

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


const PAYMENT_METHODS = [
  { key: "เงินสด",    icon: "payments",         bg: "bg-error-container",    iconColor: "text-error",                       barColor: "bg-error" },
  { key: "โอนเงิน",   icon: "account_balance",   bg: "bg-primary-container",  iconColor: "text-on-primary-container",        barColor: "bg-primary" },
  { key: "บัตรเครดิต", icon: "credit_card",       bg: "bg-tertiary-container", iconColor: "text-on-tertiary-fixed-variant",   barColor: "bg-tertiary" },
];

const PAGE_SIZE = 10;

const POS_PREFIX = "POS_IMPORT_";
const LEGACY_POS_MARKER = "POS Import:"; // format เก่าก่อนมี batch ID
const LEGACY_BATCH_ID = "__LEGACY_POS__";

function encodePayment(p: PaymentBreakdown): string {
  return `pay:เงินสด=${p.cash},โอนเงิน=${p.transfer},บัตรเครดิต=${p.card}`;
}

function parsePayment(note: string): PaymentBreakdown | null {
  const m = note.match(/pay:เงินสด=(\d+),โอนเงิน=(\d+),บัตรเครดิต=(\d+)/);
  if (!m) return null;
  return { cash: Number(m[1]), transfer: Number(m[2]), card: Number(m[3]) };
}

function parseBatchId(description: string): string | null {
  if (description.startsWith(POS_PREFIX)) return description.split(" | ")[0].trim();
  if (description.startsWith(LEGACY_POS_MARKER)) return LEGACY_BATCH_ID;
  return null;
}

/* ── Compare helpers ──────────────────────────────────────────────────────── */
function fmtMoneyI(n: number) { return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function prevMonthI(k: string) { const [y,m] = k.split("-").map(Number); return m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,"0")}`; }
function safePctI(a: number, b: number): string { if (b===0||!isFinite(b)||!isFinite(a)) return "—"; const v=((a-b)/Math.abs(b))*100; if (!isFinite(v)||isNaN(v)) return "—"; return (v>0?"+":"")+v.toFixed(1)+"%"; }
function diffDirI(a: number, b: number): "up"|"down"|"same" { return a>b?"up":a<b?"down":"same"; }
function getIncomeBreakI(txns: {type:string;date:string;category:string;amount:number}[], monthKey: string) {
  const map: Record<string,number> = {};
  for (const t of txns) { if (t.type==="income"&&t.date?.startsWith(monthKey)) map[t.category]=(map[t.category]??0)+t.amount; }
  return map;
}
const INCOME_CATS = ["ยอดขายอาหาร","ยอดขายเครื่องดื่ม","เดลิเวอรี","จัดเลี้ยง","อื่นๆ"];

export function IncomeContent() {
  const { transactions, isLoading, error, addTransaction, deleteTransaction, refreshTransactions } = useTransactions();
  const [posModalOpen, setPosModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ImportBatch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<ImportBatch | null>(null);
  const { selectedMonth } = useMonthFilter();

  /* ── Compare state ── */
  const [cmpOpen, setCmpOpen] = useState(false);
  const availMonthsI = useMemo(() => {
    const s = new Set<string>();
    for (const t of transactions) { if (t.date?.length >= 7) s.add(t.date.slice(0,7)); }
    return Array.from(s).sort((a,b) => b.localeCompare(a));
  }, [transactions]);
  const [mAI, setMAI] = useState<string>(() => selectedMonth);
  const [mBI, setMBI] = useState<string>(() => prevMonthI(selectedMonth));
  const rAI = useMemo(() => getMonthlyReportFromTransactions(transactions, mAI), [transactions, mAI]);
  const rBI = useMemo(() => getMonthlyReportFromTransactions(transactions, mBI), [transactions, mBI]);
  const incBreakA = useMemo(() => getIncomeBreakI(transactions, mAI), [transactions, mAI]);
  const incBreakB = useMemo(() => getIncomeBreakI(transactions, mBI), [transactions, mBI]);
  const noAI = rAI.totalIncome === 0 && rAI.totalExpenses === 0;
  const noBI = rBI.totalIncome === 0 && rBI.totalExpenses === 0;
  const dynIncomeCats = useMemo(() => {
    const s = new Set<string>([...Object.keys(incBreakA), ...Object.keys(incBreakB)]);
    return [...INCOME_CATS.filter(c=>s.has(c)), ...Array.from(s).filter(c=>!INCOME_CATS.includes(c))];
  }, [incBreakA, incBreakB]);

  const searchParams = useSearchParams();
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { if (searchParams.get("view") === "all") setShowAll(true); }, [searchParams]);
  const [activeTab, setActiveTab] = useState("ทั้งหมด");
  const [page, setPage] = useState(0);
  const [editingTx, setEditingTx] = useState<Parameters<typeof EditTransactionModal>[0]["transaction"]>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      const importedAt = isNaN(ts) || ts === 0 ? new Date(t.date) : new Date(ts);
      const existing = map.get(batchId);
      const tx = { id: t.id, date: t.date, category: t.category, amount: t.amount, description: t.description };
      const pay = parsePayment(t.description || "");
      if (existing) {
        existing.transactions.push(tx);
        existing.totalAmount += t.amount;
        if (pay && !existing.payBreakdown) existing.payBreakdown = pay;
      } else {
        map.set(batchId, { batchId, importedAt, transactions: [tx], totalAmount: t.amount, isLegacy, payBreakdown: pay ?? undefined });
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

  // คำนวณ payment breakdown โดยแยก POS import (อ่านจาก pay: ใน note) กับรายรับ manual
  const paymentBreakdown = useMemo(() => {
    const posPayKey: Record<string, number> = { เงินสด: 0, โอนเงิน: 0, บัตรเครดิต: 0 };
    const seenBatches = new Set<string>();
    for (const t of monthIncome) {
      const bid = parseBatchId(t.description || "");
      if (bid === LEGACY_BATCH_ID) {
        posPayKey["เงินสด"] += t.amount;
        continue;
      }
      if (bid) {
        if (!seenBatches.has(bid)) {
          seenBatches.add(bid);
          const pay = parsePayment(t.description || "");
          if (pay) {
            posPayKey["เงินสด"] += pay.cash;
            posPayKey["โอนเงิน"] += pay.transfer;
            posPayKey["บัตรเครดิต"] += pay.card;
          }
        }
        continue;
      }
    }

    const manualIncome = monthIncome.filter((t) => !parseBatchId(t.description || ""));
    const prevManualIncome = prevMonthIncome.filter((t) => !parseBatchId(t.description || ""));

    return PAYMENT_METHODS.map(({ key }) => {
      const manualAmt = manualIncome
        .filter((t) => (t.category || "").includes(key) || (t.description || "").includes(key))
        .reduce((s, t) => s + t.amount, 0);
      const amount = manualAmt + (posPayKey[key] ?? 0);
      const prevAmount = prevManualIncome
        .filter((t) => (t.category || "").includes(key) || (t.description || "").includes(key))
        .reduce((s, t) => s + t.amount, 0);
      return { key, amount, prevAmount };
    });
  }, [monthIncome, prevMonthIncome]);

  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    monthIncome.forEach((t) => {
      const cat = getCategoryLabel(t.category || "อื่นๆ");
      totals[cat] = (totals[cat] ?? 0) + t.amount;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }));
  }, [monthIncome]);

  const prevCategoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    prevMonthIncome.forEach((t) => {
      const cat = getCategoryLabel(t.category || "อื่นๆ");
      totals[cat] = (totals[cat] ?? 0) + t.amount;
    });
    return totals;
  }, [prevMonthIncome]);

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
      <div className="page-header-card rounded-2xl px-5 py-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#115637 0%,#1a7a4e 100%)" }}>
          <span className="material-symbols-outlined text-white text-[22px]">payments</span>
        </div>
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#115637", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "2px" }}>รายรับ</p>
          <h2 style={{ fontFamily: "var(--font-manrope)", fontSize: "20px", fontWeight: 800, color: "#1b1c19", lineHeight: 1.2 }}>
            รายงานรายรับประจำเดือน
          </h2>
          <p style={{ fontSize: "12px", color: "#707972", marginTop: "2px" }}>ตรวจสอบและติดตามรายรับอย่างเป็นระบบ</p>
        </div>
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
      {/* ── เปรียบเทียบเดือน ── */}
      <div className="metric-card rounded-2xl overflow-hidden">
        <button onClick={() => setCmpOpen(v => !v)} className="w-full p-6 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary-container text-[20px]">compare_arrows</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">เปรียบเทียบเดือน</h3>
              <p className="font-label-caps text-label-caps text-on-surface-variant">เลือก 2 เดือนเพื่อดูส่วนต่าง</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant">{cmpOpen ? "expand_less" : "expand_more"}</span>
        </button>
        {cmpOpen && (
          <div className="px-6 pb-6 space-y-5">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">เดือน A</p>
                <select value={mAI} onChange={e => setMAI(e.target.value)} className="w-full bg-surface-container rounded-xl px-3 py-2.5 font-body-md text-on-surface border border-outline-variant focus:outline-none focus:border-primary text-sm">
                  {availMonthsI.map(m => <option key={m} value={m}>{formatMonthLabel(m)}</option>)}
                </select>
              </div>
              <button onClick={() => { setMAI(mBI); setMBI(mAI); }} className="w-9 h-9 mb-0.5 rounded-xl border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-all shrink-0" title="สลับเดือน">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">swap_horiz</span>
              </button>
              <div className="flex-1">
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">เดือน B</p>
                <select value={mBI} onChange={e => setMBI(e.target.value)} className="w-full bg-surface-container rounded-xl px-3 py-2.5 font-body-md text-on-surface border border-outline-variant focus:outline-none focus:border-primary text-sm">
                  {availMonthsI.map(m => <option key={m} value={m}>{formatMonthLabel(m)}</option>)}
                </select>
              </div>
            </div>
            {noAI && noBI ? (
              <p className="text-center font-body-md text-on-surface-variant py-6">ไม่มีข้อมูลเปรียบเทียบ</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full table-fixed text-sm min-w-[480px]">
                  <colgroup>
                    <col className="w-[30%]" /><col className="w-[17%]" /><col className="w-[17%]" /><col className="w-[20%]" /><col className="w-[16%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b-2 border-surface-variant">
                      <th className="py-2.5 pr-2 text-left font-label-caps text-label-caps text-on-surface-variant">รายการ</th>
                      <th className="py-2.5 px-1 text-right font-label-caps text-label-caps text-on-surface-variant">{noAI ? "—" : formatMonthLabel(mAI)}</th>
                      <th className="py-2.5 px-1 text-right font-label-caps text-label-caps text-on-surface-variant">{noBI ? "—" : formatMonthLabel(mBI)}</th>
                      <th className="py-2.5 px-1 text-right font-label-caps text-label-caps text-on-surface-variant">ส่วนต่าง</th>
                      <th className="py-2.5 pl-1 text-right font-label-caps text-label-caps text-on-surface-variant">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* รายรับรวม */}
                    {(() => {
                      const a = rAI.totalIncome, b = rBI.totalIncome;
                      const diff = a - b; const dir = diffDirI(a,b); const isGood = dir==="up";
                      return (
                        <tr className="border-b border-surface-variant">
                          <td className="py-3 pr-2 font-body-md text-on-surface font-semibold">รายรับรวม</td>
                          <td className="py-3 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums">{noAI ? <span className="text-on-surface-variant text-xs">ไม่มีข้อมูล</span> : `฿${fmtMoneyI(a)}`}</td>
                          <td className="py-3 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums">{noBI ? <span className="text-on-surface-variant text-xs">ไม่มีข้อมูล</span> : `฿${fmtMoneyI(b)}`}</td>
                          <td className={`py-3 px-1 text-right font-price-table text-price-table tabular-nums ${dir==="same"?"text-on-surface-variant":isGood?"text-primary":"text-error"}`}>{dir==="same"?"—":`${diff>0?"+":"-"}฿${fmtMoneyI(Math.abs(diff))}`}</td>
                          <td className={`py-3 pl-1 text-right font-label-caps text-label-caps ${dir==="same"?"text-on-surface-variant":isGood?"text-primary":"text-error"}`}>{dir==="up"?"▲ ":dir==="down"?"▼ ":""}{safePctI(a,b)}</td>
                        </tr>
                      );
                    })()}
                    {/* Breakdown header */}
                    <tr className="bg-surface-container-low">
                      <td colSpan={5} className="py-2 pl-1 font-label-caps text-label-caps text-on-surface-variant">แยกตามหมวดรายรับ</td>
                    </tr>
                    {dynIncomeCats
                      .map(cat => ({ cat, a: incBreakA[cat]??0, b: incBreakB[cat]??0 }))
                      .filter(({a,b}) => a>0||b>0)
                      .map(({cat,a,b}) => {
                        const dir = diffDirI(a,b); const isGood = dir==="up";
                        return (
                          <tr key={cat} className="border-b border-surface-variant last:border-0">
                            <td className="py-2.5 pr-2 pl-3 font-body-md text-on-surface text-sm">{cat}</td>
                            <td className="py-2.5 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums text-sm">{a>0?`฿${fmtMoneyI(a)}`:"—"}</td>
                            <td className="py-2.5 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums text-sm">{b>0?`฿${fmtMoneyI(b)}`:"—"}</td>
                            <td className={`py-2.5 px-1 text-right font-price-table text-price-table tabular-nums text-sm ${dir==="same"?"text-on-surface-variant":isGood?"text-primary":"text-error"}`}>{dir==="same"?"—":`${(a-b)>0?"+":"-"}฿${fmtMoneyI(Math.abs(a-b))}`}</td>
                            <td className={`py-2.5 pl-1 text-right font-label-caps text-label-caps ${dir==="same"?"text-on-surface-variant":isGood?"text-primary":"text-error"}`}>{dir==="up"?"▲":dir==="down"?"▼":"—"}</td>
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
            <span className="text-xs font-medium text-on-surface-variant">{importBatches.length} รายงาน (ทั้งหมด)</span>
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
        <div className="kpi-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#707972", letterSpacing: "0.03em" }}>รายรับรวมเดือนนี้</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(17,86,55,0.12)" }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color: "#115637" }}>payments</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 text-primary">
            <span className="text-4xl font-bold opacity-50">฿</span>
            <span className="font-display-currency text-display-currency tracking-tight leading-none">
              {totalIncome.toLocaleString("th-TH")}
            </span>
          </div>
          {prevTotalIncome > 0 ? (() => {
            const trend = ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100;
            const up = trend > 0;
            return (
              <div className={`mt-3 flex items-center gap-1.5 ${up ? "text-primary" : "text-error"}`}>
                <span className="material-symbols-outlined text-[16px]">{up ? "trending_up" : "trending_down"}</span>
                <span className="font-label-caps text-label-caps">
                  {up ? "+" : ""}{trend.toFixed(1)}% จากเดือนก่อน
                </span>
              </div>
            );
          })() : (
            <p className="mt-3 font-label-caps text-label-caps text-on-surface-variant">ไม่มีข้อมูลเดือนก่อน</p>
          )}
        </div>
      )}


      {/* ── สัดส่วนรายรับตามหมวดหมู่ ───────────────────────── */}
      {!isLoading && categoryBreakdown.length > 0 && (
        <div className="metric-card rounded-2xl overflow-hidden">
          <div className="p-6 pb-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">สัดส่วนรายรับตามหมวดหมู่</h3>
          </div>
          <div className="px-6 pb-6 space-y-5">
            {categoryBreakdown.map(({ category, amount }) => {
              const meta = getCategoryMeta(category);
              const pct = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
              const prevAmt = prevCategoryBreakdown[category] ?? 0;
              const trend = prevTotalIncome > 0 && prevAmt > 0
                ? ((amount - prevAmt) / prevAmt) * 100
                : null;
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                        <span className={`material-symbols-outlined text-[16px] ${meta.iconColor}`}>{meta.icon}</span>
                      </div>
                      <div>
                        <p className="font-body-md text-on-surface text-sm">{getCategoryLabel(category)}</p>
                        {trend !== null ? (
                          <p className={`font-label-caps text-label-caps text-xs ${trend > 0 ? "text-primary" : trend < 0 ? "text-error" : "text-on-surface-variant"}`}>
                            {trend > 0 ? "▲ +" : trend < 0 ? "▼ " : ""}{trend.toFixed(1)}% จากเดือนก่อน
                          </p>
                        ) : prevTotalIncome > 0 ? (
                          <p className="font-label-caps text-label-caps text-xs text-on-surface-variant">ไม่มีเดือนก่อน</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-price-table text-price-table text-on-surface text-sm">{formatBaht(amount)}</p>
                      <p className="font-label-caps text-label-caps text-on-surface-variant text-xs">{pct.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── วิเคราะห์รายรับ ─────────────────────────────────── */}
      {!isLoading && categoryBreakdown.length > 0 && (() => {
        const insights: { icon: string; color: string; text: string }[] = [];
        const top = categoryBreakdown[0];
        if (top) {
          const pct = totalIncome > 0 ? ((top.amount / totalIncome) * 100).toFixed(0) : "0";
          insights.push({ icon: "star", color: "text-primary", text: `"${getCategoryLabel(top.category)}" สร้างรายรับสูงสุด ${pct}% ของรายรับทั้งหมด` });
        }
        if (prevTotalIncome > 0) {
          const trend = ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100;
          if (trend > 5) insights.push({ icon: "trending_up", color: "text-primary", text: `รายรับรวมเพิ่มขึ้น ${trend.toFixed(1)}% จากเดือนก่อน` });
          else if (trend < -5) insights.push({ icon: "trending_down", color: "text-error", text: `รายรับรวมลดลง ${Math.abs(trend).toFixed(1)}% จากเดือนก่อน — ควรเพิ่มยอดขาย` });
          const biggest = categoryBreakdown
            .map(c => ({ label: getCategoryLabel(c.category), pct: (prevCategoryBreakdown[c.category] ?? 0) > 0 ? ((c.amount - (prevCategoryBreakdown[c.category] ?? 0)) / (prevCategoryBreakdown[c.category] ?? 1)) * 100 : 0 }))
            .filter(c => c.pct < -10)
            .sort((a, b) => a.pct - b.pct)[0];
          if (biggest) insights.push({ icon: "arrow_downward", color: "text-error", text: `"${biggest.label}" ลดลง ${Math.abs(biggest.pct).toFixed(1)}% จากเดือนก่อน` });
        }
        if (insights.length === 0) return null;
        return (
          <div className="metric-card rounded-2xl overflow-hidden">
            <div className="px-5 pt-4 pb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" style={{ color: "#115637" }}>lightbulb</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">วิเคราะห์รายรับ</h3>
            </div>
            <div className="px-5 pb-4 space-y-1">
              {insights.map((s, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b border-surface-container-low last:border-0">
                  <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${s.color}`}>{s.icon}</span>
                  <p className="font-body-md text-on-surface text-sm">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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
              const meta = getCategoryMeta(tx.category || "");
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
                      {tx.description && (tx.description.startsWith("POS_IMPORT_") || tx.description.startsWith("POS Import:")) ? formatPosNote(tx.description, tx.category ?? "") : (tx.description || getCategoryLabel(tx.category))}
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
                const meta = getCategoryMeta(tx.category || "");
                return (
                  <SwipeableRow
                    key={tx.id}
                    onEdit={() => setEditingTx({ id: tx.id, date: tx.date, type: tx.type, category: tx.category ?? "", amount: tx.amount, note: tx.description ?? "" })}
                    onDelete={() => {
                      if (parseBatchId(tx.description || "")) {
                        alert("รายการนี้มาจาก POS Import\nกรุณาลบทั้ง batch จากประวัติการนำเข้า POS");
                        return;
                      }
                      setDeletingTxId(tx.id);
                    }}
                  >
                    <div className="grid grid-cols-[52px_1fr_auto] gap-x-3 items-center px-4 py-4 hover:bg-surface-container-low transition-colors">
                      <p className="font-label-caps text-label-caps text-on-surface leading-tight">
                        {formatTransactionDate(tx.date)}
                      </p>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                          <span className={`material-symbols-outlined text-[14px] ${meta.iconColor}`}>{meta.icon}</span>
                        </div>
                        <span className="font-body-md text-on-surface text-sm leading-tight truncate">
                          {tx.description && (tx.description.startsWith("POS_IMPORT_") || tx.description.startsWith("POS Import:")) ? formatPosNote(tx.description, tx.category ?? "") : (tx.description || getCategoryLabel(tx.category))}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-primary whitespace-nowrap text-right">
                        +{formatBaht(tx.amount)}
                      </p>
                    </div>
                  </SwipeableRow>
                );
              })}
            </div>
            <div className="p-5 border-t border-surface-container-low flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                {filteredIncome.length === 0 ? "0–0" : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filteredIncome.length)}`} of {filteredIncome.length}
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
                <p className="font-label-caps text-label-caps text-on-surface-variant">{importBatches.length} รายงาน (ทั้งหมด)</p>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="p-2 rounded-xl hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 pb-6">
              <PosImportHistory
                batches={importBatches}
                editingBatch={editingBatch}
                deletingBatch={deletingBatch}
                setEditingBatch={setEditingBatch}
                setDeletingBatch={setDeletingBatch}
                onDelete={async () => {}}
                onEdit={async () => {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── POS Batch Edit Modal (outside drawer to avoid Safari overflow bug) ── */}
      {editingBatch && (
        <EditBatchModal
          batch={editingBatch}
          onClose={() => setEditingBatch(null)}
          onSave={async (updates, _pay) => {
            for (const u of updates) {
              const payload = { date: u.date, category: u.category, amount: u.amount, note: u.note };
              await updateTransaction(u.id, payload);
            }
            await refreshTransactions();
            setEditingBatch(null);
          }}
        />
      )}

      {/* ── POS Batch Delete Modal (outside drawer to avoid Safari overflow bug) ── */}
      {deletingBatch && (
        <DeleteConfirmModal
          batch={deletingBatch}
          onClose={() => setDeletingBatch(null)}
          onConfirm={async () => {
            const ids = deletingBatch.transactions.map((t) => t.id);
            if (ids.length === 0) throw new Error("ไม่พบรายการรายรับของ import นี้");
            const supabase = getSupabaseClient();
            for (const id of ids) {
              await deleteTransactionFromSupabase(id);
              const { data: still } = await supabase
                .from("transactions").select("id").eq("id", id).maybeSingle();
              if (still) throw new Error(`ลบไม่สำเร็จ: record ${id} ยังอยู่ใน database (อาจติด RLS)`);
            }
            await refreshTransactions();
            setDeletingBatch(null);
            setHistoryOpen(false);
          }}
        />
      )}

      {/* BUG-005: in-app delete confirmation */}
      <ConfirmModal
        open={!!deletingTxId}
        title="ลบรายรับ"
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
        onConfirm={async (groups: PosGroup[], payment: PaymentBreakdown) => {
          if (groups.length === 0) throw new Error("ไม่มีข้อมูลให้บันทึก");
          const batchId = `${POS_PREFIX}${Date.now()}`;
          const payStr = encodePayment(payment);
          for (const g of groups) {
            await addTransaction({
              date: g.date,
              type: "income" as const,
              category: g.category,
              amount: g.amount,
              note: `${batchId} | ${g.category} | รวม ${g.count} รายการ | method:${g.paymentSummary} | ${payStr}`,
            });
          }
          await refreshTransactions();
        }}
      />

    </div>
  );
}
