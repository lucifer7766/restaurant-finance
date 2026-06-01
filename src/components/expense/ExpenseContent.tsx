"use client";

import { useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import { useMonthFilter } from "@/context/MonthFilterContext";
import { filterTransactionsByMonth } from "@/lib/data";
import { formatMonthLabel, formatTransactionDate, getCategoryLabel } from "@/lib/utils";
import { ReceiptScanModal, type ScanResult } from "@/components/expense/ReceiptScanModal";

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

function getBadgeMeta(category: string): { text: string; textColor: string } {
  if (category.includes("วัตถุดิบ")) return { text: "+12% vs last month", textColor: "text-on-surface-variant" };
  if (category.includes("ค่าแรง"))   return { text: "Stable",             textColor: "text-on-surface-variant" };
  if (category.includes("ค่าเช่า"))  return { text: "Fixed",              textColor: "text-on-surface-variant" };
  if (category.includes("ไฟฟ้า"))    return { text: "-5% energy saving",  textColor: "text-primary" };
  if (category.includes("การตลาด"))  return { text: "Variable",           textColor: "text-on-surface-variant" };
  return { text: "เดือนนี้",          textColor: "text-on-surface-variant" };
}

const PAGE_SIZE = 10;

export function ExpenseContent() {
  const { transactions, isLoading, error } = useTransactions();
  const { selectedMonth } = useMonthFilter();

  const [activeTab, setActiveTab] = useState("ทั้งหมด");
  const [page, setPage] = useState(0);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const FALLBACK_RESULT: ScanResult = {
    amount: null, date: new Date().toISOString().slice(0, 10),
    category: null, note: null, confidence: "unreadable",
  };

  async function handleReceiptFile(file: File) {
    setReceiptFile(file);
    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // strip "data:image/...;base64," prefix
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      });

      const data: ScanResult = res.ok ? await res.json() : FALLBACK_RESULT;
      setScanResult(data);
    } catch {
      setScanResult(FALLBACK_RESULT);
    } finally {
      setScanning(false);
      setModalOpen(true);
      // reset file input so same file can be reselected
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
        <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-1">
          MANAGEMENT DASHBOARD
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

      {error && (
        <div className="sand-card p-4 rounded-xl flex items-center gap-3 border-l-4 border-error">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-on-surface">{error}</p>
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
            const badge = getBadgeMeta(category);
            return (
              <div key={category} className="metric-card p-6 rounded-2xl">
                {/* Top row: icon + badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.bg}`}>
                    <span className={`material-symbols-outlined text-[20px] ${meta.iconColor}`}>{meta.icon}</span>
                  </div>
                  <span className={`font-label-caps text-label-caps ${badge.textColor}`}>
                    {badge.text}
                  </span>
                </div>
                {/* Category name */}
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">
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

      {/* ── รายการรายจ่ายล่าสุด ─────────────────────────────── */}
      <div className="metric-card rounded-2xl overflow-hidden">
        <div className="p-6 pb-4 flex items-center gap-3 border-b border-surface-container-low">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">receipt_long</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface">รายการรายจ่ายล่าสุด</h3>
        </div>

        {/* Filter tabs */}
        <div className="px-4 py-3 flex gap-2 overflow-x-auto border-b border-surface-container-low">
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

        {isLoading ? (
          <p className="px-6 py-10 text-center font-body-md text-on-surface-variant">กำลังโหลด...</p>
        ) : monthExpenses.length === 0 ? (
          <p className="px-6 py-10 text-center font-body-md text-on-surface-variant">ไม่มีรายจ่ายใน{monthLabel}</p>
        ) : (
          <>
            <div className="px-4 py-1 grid grid-cols-[auto_1fr_auto_auto] gap-x-3">
              <span className="font-label-caps text-label-caps text-on-surface-variant">วันที่</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant">รายการ</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant">หมวดหมู่</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant text-right">จำนวน</span>
            </div>
            <div className="divide-y divide-surface-container-low">
              {pagedExpenses.map((tx) => {
                const meta = getCategoryMeta(tx.category || "");
                return (
                  <div key={tx.id} className="px-4 py-4 grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center hover:bg-surface-container-low transition-colors">
                    <div className="min-w-[52px]">
                      <p className="font-label-caps text-label-caps text-on-surface leading-tight">
                        {formatTransactionDate(tx.date)}
                      </p>
                    </div>
                    <div>
                      <p className="font-body-md text-on-surface text-sm leading-tight">
                        {tx.description || getCategoryLabel(tx.category)}
                      </p>
                    </div>
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-label-caps text-label-caps bg-surface-container text-on-surface-variant">
                        {getCategoryLabel(tx.category)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-price-table text-price-table text-on-surface whitespace-nowrap">
                        ฿{tx.amount.toLocaleString("th-TH")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-5 border-t border-surface-container-low flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                Showing {filteredExpenses.length === 0 ? 0 : page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, filteredExpenses.length)} of {filteredExpenses.length} expenses
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Receipt Scan Modal ─────────────────────────────── */}
      <ReceiptScanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => setModalOpen(false)}
        initialData={scanResult}
      />

    </div>
  );
}
