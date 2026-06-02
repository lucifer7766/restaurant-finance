"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import { useMonthFilter } from "@/context/MonthFilterContext";
import { filterTransactionsByMonth, getMonthlyReportFromTransactions } from "@/lib/data";
import { formatMonthLabel, formatTransactionDate, getCategoryLabel } from "@/lib/utils";
import { ReceiptScanModal, type ScanResult } from "@/components/expense/ReceiptScanModal";
import EditTransactionModal from "@/components/transactions/EditTransactionModal";
import { RecurringExpensePanel } from "@/components/expense/RecurringExpensePanel";
import { PinGate } from "@/components/ui/PinGate";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { RecurringTemplate } from "@/lib/recurring";

const EXPENSE_CATEGORY_META: Record<string, { icon: string; iconColor: string; bg: string }> = {
  วัตถุดิบ: { icon: "grocery",       iconColor: "text-on-primary-container",      bg: "bg-primary-container" },
  ค่าแรง:   { icon: "groups",         iconColor: "text-on-tertiary-fixed-variant", bg: "bg-tertiary-container" },
  ค่าเช่า:  { icon: "home",           iconColor: "text-on-secondary-container",    bg: "bg-secondary-container" },
  ไฟฟ้า:    { icon: "electric_bolt",  iconColor: "text-error",                     bg: "bg-error-container" },
  การตลาด:  { icon: "campaign",       iconColor: "text-on-primary-container",      bg: "bg-primary-fixed" },
  ซ่อมบำรุง: { icon: "build",         iconColor: "text-on-surface-variant",        bg: "bg-surface-container-high" },
  บรรจุภัณฑ์: { icon: "package_2",   iconColor: "text-on-surface-variant",        bg: "bg-surface-container-high" },
};

function getCategoryMeta(category: string) {
  const key = Object.keys(EXPENSE_CATEGORY_META).find((k) => category.includes(k));
  return key
    ? EXPENSE_CATEGORY_META[key]
    : { icon: "receipt_long", iconColor: "text-on-surface-variant", bg: "bg-surface-container-high" };
}

function getPrevMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const PAGE_SIZE = 10;

/* ── Compare helpers ──────────────────────────────────────────────────────── */
function fmtMoney(n: number) { return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function prevMonthKey(k: string) { const [y,m] = k.split("-").map(Number); return m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,"0")}`; }
function safePct(a: number, b: number): string { if (b===0||!isFinite(b)||!isFinite(a)) return "—"; const v=((a-b)/Math.abs(b))*100; if (!isFinite(v)||isNaN(v)) return "—"; return (v>0?"+":"")+v.toFixed(1)+"%"; }
function diffDir(a: number, b: number): "up"|"down"|"same" { return a>b?"up":a<b?"down":"same"; }

const EXPENSE_CATS = ["วัตถุดิบ","ค่าแรง","ค่าเช่า","ค่าน้ำค่าไฟ","การตลาด","บรรจุภัณฑ์","ซ่อมบำรุง","อื่นๆ"];

export function ExpenseContent() {
  const { transactions, isLoading, error, addTransaction, deleteTransaction, refreshTransactions } = useTransactions();
  const { selectedMonth } = useMonthFilter();

  const searchParams = useSearchParams();
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { if (searchParams.get("view") === "all") setShowAll(true); }, [searchParams]);
  const [activeTab, setActiveTab] = useState("ทั้งหมด");
  const [page, setPage] = useState(0);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [editingTx, setEditingTx] = useState<Parameters<typeof EditTransactionModal>[0]["transaction"]>(null);
  const [pinTarget, setPinTarget] = useState<(() => void) | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function withPin(action: () => void) {
    setPinTarget(() => action);
  }

  /* ── Compare state ── */
  const [cmpOpen, setCmpOpen] = useState(false);
  const availMonths = useMemo(() => {
    const s = new Set<string>();
    for (const t of transactions) { if (t.date?.length >= 7) s.add(t.date.slice(0,7)); }
    return Array.from(s).sort((a,b) => b.localeCompare(a));
  }, [transactions]);
  const [mA, setMA] = useState<string>(() => selectedMonth);
  const [mB, setMB] = useState<string>(() => prevMonthKey(selectedMonth));
  const rA = useMemo(() => getMonthlyReportFromTransactions(transactions, mA), [transactions, mA]);
  const rB = useMemo(() => getMonthlyReportFromTransactions(transactions, mB), [transactions, mB]);
  const noA = rA.totalExpenses === 0 && rA.totalIncome === 0;
  const noB = rB.totalExpenses === 0 && rB.totalIncome === 0;
  /* dynamic categories = union of both months */
  const dynCats = useMemo(() => {
    const s = new Set<string>();
    [...rA.expenseBreakdown, ...rB.expenseBreakdown].forEach(e => s.add(e.category));
    EXPENSE_CATS.forEach(c => s.delete(c));
    return [...EXPENSE_CATS.filter(c => s.has(c) || rA.expenseBreakdown.find(e=>e.category===c) || rB.expenseBreakdown.find(e=>e.category===c)), ...Array.from(s)];
  }, [rA, rB]);

  const FALLBACK_RESULT: ScanResult = {
    amount: null, date: new Date().toISOString().slice(0, 10),
    category: null, note: null, confidence: "unreadable",
  };

  /** Compress image via canvas — max 900px wide, quality 0.75, output JPEG */
  async function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      console.log("[compress] original size:", (file.size / 1024).toFixed(1), "KB");
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_W = 900;
        let { width, height } = img;
        console.log("[compress] original dimensions:", width, "x", height);
        if (width > MAX_W) {
          height = Math.round((height * MAX_W) / width);
          width = MAX_W;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        const b64 = dataUrl.split(",")[1] ?? "";
        const compressedKB = Math.ceil((b64.length * 3) / 4) / 1024;
        console.log("[compress] compressed size:", compressedKB.toFixed(1), "KB", "| dimensions:", width, "x", height);
        resolve({ base64: b64, mimeType: "image/jpeg" });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  const MAX_BYTES = 1.4 * 1024 * 1024; // 1.4 MB safe limit

  async function handleReceiptFile(file: File) {
    setReceiptFile(file);
    setScanning(true);
    try {
      let base64: string;
      let mimeType: string;

      if (file.type === "application/pdf") {
        // PDF — read as-is
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        mimeType = "application/pdf";
      } else {
        // Image — compress first
        const compressed = await compressImage(file);
        base64 = compressed.base64;
        mimeType = compressed.mimeType;
      }

      // Guard: still too large → open modal with fallback + note
      const byteSize = Math.ceil((base64.length * 3) / 4);
      if (byteSize > MAX_BYTES) {
        setScanResult({ ...FALLBACK_RESULT, note: "ไฟล์มีขนาดใหญ่เกินไป กรุณาลองรูปที่มีขนาดเล็กกว่า" });
        setScanning(false);
        setModalOpen(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const res = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });

      const data: ScanResult = res.ok ? await res.json() : FALLBACK_RESULT;
      setScanResult(data);
    } catch {
      setScanResult(FALLBACK_RESULT);
    } finally {
      setScanning(false);
      setModalOpen(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const monthLabel = formatMonthLabel(selectedMonth);

  const allExpenses = useMemo(
    () => transactions.filter((t) => t.type === "expense"),
    [transactions]
  );

  const monthExpenses = useMemo(
    () => filterTransactionsByMonth(allExpenses, selectedMonth),
    [allExpenses, selectedMonth]
  );

  const totalExpense = useMemo(
    () => monthExpenses.reduce((s, t) => s + t.amount, 0),
    [monthExpenses]
  );

  const prevMonthExpenses = useMemo(
    () => filterTransactionsByMonth(allExpenses, getPrevMonth(selectedMonth)),
    [allExpenses, selectedMonth]
  );

  const prevCategoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    prevMonthExpenses.forEach((t) => {
      const cat = t.category || "อื่นๆ";
      totals[cat] = (totals[cat] ?? 0) + t.amount;
    });
    return totals;
  }, [prevMonthExpenses]);

  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    monthExpenses.forEach((t) => {
      const cat = t.category || "อื่นๆ";
      totals[cat] = (totals[cat] ?? 0) + t.amount;
    });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount }));
  }, [monthExpenses]);

  const tabCategories = useMemo(
    () => ["ทั้งหมด", ...categoryBreakdown.slice(0, 3).map((c) => c.category)],
    [categoryBreakdown]
  );

  const filteredExpenses = useMemo(() => {
    if (activeTab === "ทั้งหมด") return monthExpenses;
    return monthExpenses.filter((t) => t.category === activeTab);
  }, [monthExpenses, activeTab]);

  const totalPages = Math.ceil(filteredExpenses.length / PAGE_SIZE);
  const pagedExpenses = filteredExpenses.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    setPage(0);
  }

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-on-surface-variant tracking-normal mb-1">
          แดชบอร์ดรายจ่าย
        </p>
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">
          รายงานรายจ่ายประจำเดือน
        </h2>
        <p className="font-body-md text-on-surface-variant">
          ตรวจสอบและจัดการต้นทุนของ PLU Bistro อย่างเป็นระบบ
        </p>
      </div>

      {/* ── Action buttons ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/expense/new" className="btn-primary flex-1 text-center">
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          เพิ่มรายจ่าย
        </Link>
        <label className={`btn-secondary flex-1 cursor-pointer ${scanning ? "opacity-60 pointer-events-none" : ""}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptFile(f); }}
          />
          <span className="material-symbols-outlined text-[18px]">
            {scanning ? "hourglass_top" : "photo_camera"}
          </span>
          {scanning ? "กำลังสแกน..." : "ถ่ายรูปใบเสร็จ"}
        </label>
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
                <select value={mA} onChange={e => setMA(e.target.value)} className="w-full bg-surface-container rounded-xl px-3 py-2.5 font-body-md text-on-surface border border-outline-variant focus:outline-none focus:border-primary text-sm">
                  {availMonths.map(m => <option key={m} value={m}>{formatMonthLabel(m)}</option>)}
                </select>
              </div>
              <button onClick={() => { setMA(mB); setMB(mA); }} className="w-9 h-9 mb-0.5 rounded-xl border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-all shrink-0" title="สลับเดือน">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">swap_horiz</span>
              </button>
              <div className="flex-1">
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">เดือน B</p>
                <select value={mB} onChange={e => setMB(e.target.value)} className="w-full bg-surface-container rounded-xl px-3 py-2.5 font-body-md text-on-surface border border-outline-variant focus:outline-none focus:border-primary text-sm">
                  {availMonths.map(m => <option key={m} value={m}>{formatMonthLabel(m)}</option>)}
                </select>
              </div>
            </div>
            {noA && noB ? (
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
                      <th className="py-2.5 px-1 text-right font-label-caps text-label-caps text-on-surface-variant">{noA ? "—" : formatMonthLabel(mA)}</th>
                      <th className="py-2.5 px-1 text-right font-label-caps text-label-caps text-on-surface-variant">{noB ? "—" : formatMonthLabel(mB)}</th>
                      <th className="py-2.5 px-1 text-right font-label-caps text-label-caps text-on-surface-variant">ส่วนต่าง</th>
                      <th className="py-2.5 pl-1 text-right font-label-caps text-label-caps text-on-surface-variant">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* รายจ่ายรวม */}
                    {(() => {
                      const a = rA.totalExpenses, b = rB.totalExpenses;
                      const diff = a - b; const dir = diffDir(a, b); const isGood = dir === "down";
                      return (
                        <tr className="border-b border-surface-variant">
                          <td className="py-3 pr-2 font-body-md text-on-surface font-semibold">รายจ่ายรวม</td>
                          <td className="py-3 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums">{noA ? <span className="text-on-surface-variant text-xs">ไม่มีข้อมูล</span> : `฿${fmtMoney(a)}`}</td>
                          <td className="py-3 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums">{noB ? <span className="text-on-surface-variant text-xs">ไม่มีข้อมูล</span> : `฿${fmtMoney(b)}`}</td>
                          <td className={`py-3 px-1 text-right font-price-table text-price-table tabular-nums ${dir==="same"?"text-on-surface-variant":isGood?"text-primary":"text-error"}`}>{dir==="same"?"—":`${diff>0?"+":"-"}฿${fmtMoney(Math.abs(diff))}`}</td>
                          <td className={`py-3 pl-1 text-right font-label-caps text-label-caps ${dir==="same"?"text-on-surface-variant":isGood?"text-primary":"text-error"}`}>{dir==="up"?"▲ ":dir==="down"?"▼ ":""}{safePct(a,b)}</td>
                        </tr>
                      );
                    })()}
                    {/* Breakdown header */}
                    <tr className="bg-surface-container-low">
                      <td colSpan={5} className="py-2 pl-1 font-label-caps text-label-caps text-on-surface-variant">Breakdown รายจ่าย</td>
                    </tr>
                    {dynCats
                      .map(cat => ({ cat, a: rA.expenseBreakdown.find(e=>e.category===cat)?.amount??0, b: rB.expenseBreakdown.find(e=>e.category===cat)?.amount??0 }))
                      .filter(({a,b}) => a>0||b>0)
                      .map(({cat,a,b}) => {
                        const dir = diffDir(a,b); const isGood = dir==="down";
                        return (
                          <tr key={cat} className="border-b border-surface-variant last:border-0">
                            <td className="py-2.5 pr-2 pl-3 font-body-md text-on-surface text-sm">{cat}</td>
                            <td className="py-2.5 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums text-sm">{a>0?`฿${fmtMoney(a)}`:"—"}</td>
                            <td className="py-2.5 px-1 text-right font-price-table text-price-table text-on-surface tabular-nums text-sm">{b>0?`฿${fmtMoney(b)}`:"—"}</td>
                            <td className={`py-2.5 px-1 text-right font-price-table text-price-table tabular-nums text-sm ${dir==="same"?"text-on-surface-variant":isGood?"text-primary":"text-error"}`}>{dir==="same"?"—":`${(a-b)>0?"+":"-"}฿${fmtMoney(Math.abs(a-b))}`}</td>
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

      <RecurringExpensePanel
        onApply={async (templates: RecurringTemplate[]) => {
          const today = new Date().toISOString().slice(0, 10);
          for (const t of templates) {
            await addTransaction({ date: today, type: "expense", category: t.category, amount: t.amount, note: t.note || `รายจ่ายประจำ — ${t.category}` });
          }
          await refreshTransactions();
        }}
      />

      {error && (
        <div className="sand-card p-4 rounded-xl flex items-center gap-3 border-l-4 border-error">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-on-surface">{error}</p>
        </div>
      )}

      {/* ── Total Expense Summary ───────────────────────────── */}
      {isLoading ? (
        <div className="metric-card rounded-2xl p-7 animate-pulse">
          <div className="h-3 bg-surface-container-highest rounded w-1/3 mb-5" />
          <div className="h-14 bg-surface-container-highest rounded w-2/3" />
        </div>
      ) : (
        <div className="metric-card p-7 rounded-2xl">
          <span className="text-xs font-medium text-on-surface-variant block mb-4 tracking-normal">
            รวมรายจ่ายทั้งหมด
          </span>
          <div className="flex items-baseline gap-2 text-error">
            <span className="text-4xl font-bold opacity-50">฿</span>
            <span className="font-display-currency text-display-currency tracking-tight leading-none">
              {totalExpense.toLocaleString("th-TH")}
            </span>
          </div>
        </div>
      )}

      {/* ── Category Cards ──────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="metric-card rounded-2xl p-7 animate-pulse">
              <div className="h-3 bg-surface-container-highest rounded w-1/3 mb-5" />
              <div className="h-12 bg-surface-container-highest rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : categoryBreakdown.length === 0 ? (
        <div className="metric-card p-10 rounded-2xl text-center">
          <p className="font-body-md text-on-surface-variant">ยังไม่มีรายจ่ายใน{monthLabel}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categoryBreakdown.map(({ category, amount }) => {
            const meta = getCategoryMeta(category);
            const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
            const prevAmt = prevCategoryTotals[category] ?? 0;
            const hasPrev = prevAmt > 0;
            const trend = hasPrev ? Math.round(((amount - prevAmt) / prevAmt) * 100) : 0;
            return (
              <div key={category} className="metric-card p-6 rounded-2xl">
                {/* Top row: icon + stats */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.bg}`}>
                    <span className={`material-symbols-outlined text-[20px] ${meta.iconColor}`}>{meta.icon}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium tracking-normal text-on-surface-variant">{pct}% ของรายจ่ายทั้งหมด</p>
                    {hasPrev && (
                      <p className={`text-xs font-medium tracking-normal ${trend >= 0 ? "text-error" : "text-primary"}`}>
                        {trend >= 0 ? "+" : ""}{trend}% จากเดือนก่อน
                      </p>
                    )}
                  </div>
                </div>
                {/* Category name */}
                <p className="text-sm font-medium text-on-surface-variant mb-1">
                  {getCategoryLabel(category)}
                </p>
                {/* Amount */}
                <div className="flex items-baseline gap-1 text-on-surface">
                  <span className="text-base font-bold opacity-50">฿</span>
                  <span className="text-3xl font-bold font-headline-md tracking-tight">
                    {amount.toLocaleString("th-TH")}
                  </span>
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
        ) : monthExpenses.length === 0 ? (
          <p className="px-6 py-10 text-center font-body-md text-on-surface-variant">ไม่มีรายจ่ายใน{monthLabel}</p>
        ) : !showAll ? (
          /* ── Recent (no edit/delete) ── */
          <>
            <div className="mt-4 divide-y divide-surface-container-low">
              {monthExpenses.slice(0, 5).map((tx) => {
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
                        {tx.description || getCategoryLabel(tx.category)}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm text-error whitespace-nowrap">
                        -฿{tx.amount.toLocaleString("th-TH")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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
              {pagedExpenses.map((tx) => {
                const meta = getCategoryMeta(tx.category || "");
                return (
                  /* BUG-003: ลบ overflow-x-auto ออก — ปุ่มเห็นได้ตลอด */
                  <div key={tx.id} className="flex items-center hover:bg-surface-container-low transition-colors">
                    <div className="grid grid-cols-[52px_1fr_auto] gap-x-3 items-center px-4 py-4 flex-1 min-w-0">
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
                      <p className="font-semibold text-sm text-error whitespace-nowrap text-right">
                        -฿{tx.amount.toLocaleString("th-TH")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 px-3 border-l border-surface-container-low shrink-0">
                      <button
                        onClick={() => setEditingTx({ id: tx.id, date: tx.date, type: tx.type, category: tx.category ?? "", amount: tx.amount, note: tx.description ?? "" })}
                        className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      {/* BUG-005: ใช้ in-app modal แทน window.confirm (ผ่าน PinGate ก่อน) */}
                      <button
                        onClick={() => withPin(() => setDeletingTxId(tx.id))}
                        className="p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-5 border-t border-surface-container-low flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredExpenses.length)} of {filteredExpenses.length}
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

      {/* ── Edit Transaction Modal ────────────────────────── */}
      <EditTransactionModal
        transaction={editingTx}
        onClose={() => setEditingTx(null)}
        onSaved={async () => { setEditingTx(null); await refreshTransactions(); }}
      />

      {/* ── Receipt Scan Modal ─────────────────────────────── */}
      <ReceiptScanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={async (data) => {
          console.log("[OCR_CONFIRM_DATA]", data);
          try {
            await addTransaction({
              date: data.date,
              type: "expense",
              category: data.category || "อื่นๆ",
              amount: data.amount,
              note: data.note || "",
            } as Parameters<typeof addTransaction>[0]);
            console.log("[OCR_ADD_SUCCESS]", data);
            setModalOpen(false);
          } catch (e) {
            console.error("[OCR_CONFIRM_ERROR_FULL]", e);
            alert(e instanceof Error ? e.message : JSON.stringify(e));
          }
        }}
        initialData={scanResult}
      />

      {/* BUG-005: in-app delete confirmation */}
      <ConfirmModal
        open={!!deletingTxId}
        title="ลบรายจ่าย"
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

      {pinTarget && (
        <PinGate
          forcePrompt
          title="ยืนยันการลบ"
          subtitle="ใส่ PIN เพื่อยืนยัน — ลบแล้วไม่สามารถกู้คืนได้"
          onUnlock={() => { pinTarget(); setPinTarget(null); }}
          onCancel={() => setPinTarget(null)}
        />
      )}

    </div>
  );
}
