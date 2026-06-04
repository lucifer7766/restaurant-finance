"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { RecentTransaction } from "@/lib/data";
import {
  deleteTransaction as deleteTransactionFromSupabase,
  fetchTransactions,
  insertTransaction,
  type NewTransaction,
} from "@/lib/supabase/transactions";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { getCategoryLabel, formatPosNote, formatMonthLabel } from "@/lib/utils";
import { useMonthFilter } from "@/context/MonthFilterContext";
import { filterTransactionsByMonth, restaurantName } from "@/lib/data";
import EditTransactionModal from "./EditTransactionModal";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import * as XLSX from "xlsx";

type TransactionType = "income" | "expense";

type AppTransaction = RecentTransaction & {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  note?: string;
  description?: string;
};

type TransactionsContextValue = {
  transactions: AppTransaction[];
  isLoading: boolean;
  error: string | null;
  addTransaction: (transaction: NewTransaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  refreshTransactions: () => Promise<void>;
};

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

function sortByDateNewestFirst(transactions: AppTransaction[]) {
  return [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

function formatBaht(amount: number) {
  return `฿${Number(amount || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isPOS(desc: string) {
  return desc.startsWith("POS_IMPORT_") || desc.startsWith("POS Import:");
}

function getText(transaction: AppTransaction) {
  const desc = transaction.note || transaction.description || "";
  if (desc && isPOS(desc)) return formatPosNote(desc, transaction.category ?? "");
  return desc || "-";
}

/* ─── Provider ─────────────────────────────────────────────────────────────── */

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<AppTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTransactions = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await fetchTransactions();
      setTransactions(sortByDateNewestFirst(data as AppTransaction[]));
      setError(null);
    } catch (loadError) {
      setTransactions([]);
      setError(formatSupabaseError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTransactions();
  }, [refreshTransactions]);

  async function addTransaction(transaction: NewTransaction) {
    await insertTransaction(transaction);
    await refreshTransactions();
  }

  async function removeTransaction(id: string) {
    await deleteTransactionFromSupabase(id);
    await refreshTransactions();
  }

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        isLoading,
        error,
        addTransaction,
        deleteTransaction: removeTransaction,
        refreshTransactions,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionsContext);

  if (!context) {
    throw new Error("useTransactions must be used inside TransactionsProvider");
  }

  return context;
}

/* ─── TransactionsContent ──────────────────────────────────────────────────── */

export function TransactionsContent() {
  const { transactions, isLoading, error, addTransaction, deleteTransaction, refreshTransactions } =
    useTransactions();

  const { selectedMonth } = useMonthFilter();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<AppTransaction | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "expense" as TransactionType,
    category: "",
    amount: "",
    note: "",
  });

  const categories = useMemo(() => {
    return Array.from(new Set(transactions.map((item) => item.category).filter(Boolean)));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const keyword = search.toLowerCase();

      const matchesSearch =
        item.category?.toLowerCase().includes(keyword) ||
        getText(item).toLowerCase().includes(keyword) ||
        item.amount.toString().includes(keyword);

      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, search, typeFilter, categoryFilter]);

  async function handleAddTransaction() {
    const amount = Number(form.amount);

    if (!form.date || !form.category || !amount) {
      setAddError("กรอกข้อมูลให้ครบก่อน");
      return;
    }

    setAddError(null);

    try {
      await addTransaction({
        date: form.date,
        type: form.type,
        category: form.category,
        amount,
        note: form.note,
      } as NewTransaction);

      setForm({
        date: new Date().toISOString().slice(0, 10),
        type: "expense",
        category: "",
        amount: "",
        note: "",
      });

      setIsAddOpen(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  function openAddModal(type: TransactionType) {
    setAddError(null);
    setForm((prev) => ({ ...prev, type }));
    setIsAddOpen(true);
  }

  async function handleDelete(id: string) {
    const ok = confirm("ต้องการลบรายการนี้ใช่ไหม?");
    if (!ok) return;

    try {
      await deleteTransaction(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "ลบไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  function getExportRows() {
    return filteredTransactions.map((item) => ({
      Date: item.date,
      Description: getText(item),
      Category: item.category,
      Type: item.type,
      Amount: item.amount,
    }));
  }

  function handleExportCSV() {
    const headers = ["Date", "Description", "Category", "Type", "Amount"];
    const rows = filteredTransactions.map((item) => [
      item.date,
      getText(item),
      item.category,
      item.type,
      item.amount,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["﻿" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${restaurantName.toLowerCase()}-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExportExcel() {
    const rows = getExportRows();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 28 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(
      workbook,
      `${restaurantName.toLowerCase()}-transactions-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  }

  /* ── Derived summary from month-filtered transactions ── */
  const monthFilteredTransactions = useMemo(
    () => filterTransactionsByMonth(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const summaryIncome = monthFilteredTransactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const summaryExpense = monthFilteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const summaryNet = summaryIncome - summaryExpense;

  /* ── Tab labels ── */
  const tabs: { value: "all" | TransactionType; label: string }[] = [
    { value: "all", label: "ทั้งหมด" },
    { value: "income", label: "รายรับ" },
    { value: "expense", label: "รายจ่าย" },
  ];

  /* ════════════════════════════════════════════════════════════════════════════
     JSX
  ════════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-stack-md">
      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="page-header-card rounded-2xl px-5 py-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#115637 0%,#1a7a4e 100%)" }}>
          <span className="material-symbols-outlined text-white text-[22px]">list_alt</span>
        </div>
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#115637", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "2px" }}>รายการ</p>
          <h2 style={{ fontFamily: "var(--font-manrope)", fontSize: "20px", fontWeight: 800, color: "#1b1c19", lineHeight: 1.2 }}>รายการทั้งหมด</h2>
          <p style={{ fontSize: "12px", color: "#707972", marginTop: "2px" }}>จัดการรายรับและรายจ่ายทั้งหมด</p>
        </div>
      </div>

      {/* ── Primary action buttons ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => openAddModal("income")}
          className="btn-primary flex-1"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          เพิ่มรายรับ
        </button>
        <button
          onClick={() => openAddModal("expense")}
          className="btn-secondary flex-1"
        >
          <span className="material-symbols-outlined text-[18px]">remove_circle</span>
          เพิ่มรายจ่าย
        </button>
      </div>

      {/* ── Export buttons ─────────────────────────────────── */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant font-label-caps text-label-caps text-on-surface-variant hover:bg-surface-container transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          CSV
        </button>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary font-label-caps text-label-caps text-primary hover:bg-primary-container/20 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">table_view</span>
          Excel
        </button>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card p-6 rounded-2xl">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">รายรับรวม</span>
          <div className="flex items-baseline gap-1.5 text-primary">
            <span className="text-xl font-bold opacity-60">฿</span>
            <span className="text-3xl font-bold font-headline-md tracking-tight">
              {summaryIncome.toLocaleString("th-TH")}
            </span>
          </div>
        </div>
        <div className="kpi-card p-6 rounded-2xl">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">รายจ่ายรวม</span>
          <div className="flex items-baseline gap-1.5 text-error">
            <span className="text-xl font-bold opacity-60">฿</span>
            <span className="text-3xl font-bold font-headline-md tracking-tight">
              {summaryExpense.toLocaleString("th-TH")}
            </span>
          </div>
        </div>
        <div className="kpi-card p-6 rounded-2xl">
          <span className="font-label-caps text-label-caps text-on-surface-variant block mb-3">กำไรสุทธิ</span>
          <div className={`flex items-baseline gap-1.5 ${summaryNet >= 0 ? "text-primary" : "text-error"}`}>
            <span className="text-xl font-bold opacity-60">฿</span>
            <span className="text-3xl font-bold font-headline-md tracking-tight">
              {Math.abs(summaryNet).toLocaleString("th-TH")}
            </span>
          </div>
        </div>
      </div>
      <p className="font-label-caps text-label-caps text-on-surface-variant text-right -mt-2">
        ข้อมูลเดือน {formatMonthLabel(selectedMonth)}
      </p>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="sand-card p-4 rounded-xl flex items-center gap-3 border-l-4 border-error">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-on-surface">{error}</p>
        </div>
      )}

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="metric-card p-4 rounded-2xl flex flex-col gap-4 md:flex-row md:items-center">
        {/* Type tabs */}
        <div className="flex rounded-xl bg-surface-container p-1 gap-1 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={`px-4 py-2 rounded-lg font-body-md transition-all ${
                typeFilter === tab.value
                  ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 bg-surface-container rounded-xl px-3 py-2">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหารายการ..."
            className="flex-1 bg-transparent font-body-md text-on-surface placeholder:text-on-surface-variant outline-none"
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-surface-container rounded-xl px-3 py-2.5 font-body-md text-on-surface outline-none border-none"
        >
          <option value="all">ทุกหมวดหมู่</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* ── Transactions table ─────────────────────────────────────────────── */}
      <section className="metric-card rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center font-body-md text-on-surface-variant">
            กำลังโหลด...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-10 text-center font-body-md text-on-surface-variant">
            ไม่พบรายการ
          </div>
        ) : (
          <div className="divide-y divide-surface-container-low">
            {filteredTransactions.map((item) => (
              <SwipeableRow
                key={item.id}
                onEdit={() => setEditingTransaction(item)}
                onDelete={() => handleDelete(item.id)}
              >
                <div className="px-5 py-4 flex items-center gap-3 hover:bg-surface-container-low transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === "income" ? "bg-primary-container" : "bg-error-container"
                  }`}>
                    <span className={`material-symbols-outlined text-[18px] ${
                      item.type === "income" ? "text-on-primary-container" : "text-on-error-container"
                    }`}>
                      {item.type === "income" ? "arrow_upward" : "arrow_downward"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-on-surface truncate">{getText(item)}</p>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">
                      {getCategoryLabel(item.category ?? "")} · {item.date}
                    </p>
                  </div>
                  <p className={`font-semibold text-sm whitespace-nowrap shrink-0 ${
                    item.type === "income" ? "text-primary" : "text-error"
                  }`}>
                    {item.type === "income" ? "+" : "-"}{formatBaht(item.amount)}
                  </p>
                </div>
              </SwipeableRow>
            ))}
          </div>
        )}
      </section>

      {/* ── Add Transaction Modal ──────────────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="p-6 border-b border-surface-variant flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    form.type === "income"
                      ? "bg-primary text-on-primary"
                      : "bg-primary-container text-on-primary-container"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {form.type === "income" ? "add_circle" : "remove_circle"}
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  {form.type === "income" ? "เพิ่มรายรับ" : "เพิ่มรายจ่าย"}
                </h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="material-symbols-outlined p-2 hover:bg-surface-variant rounded-full text-on-surface-variant"
              >
                close
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4">
              {addError && (
                <div className="flex items-center gap-2 p-3 bg-error-container rounded-xl">
                  <span className="material-symbols-outlined text-error text-[18px]">error</span>
                  <p className="font-body-md text-on-error-container">{addError}</p>
                </div>
              )}
              {/* Type toggle inside modal */}
              <div className="flex rounded-xl bg-surface-container p-1 gap-1">
                <button
                  onClick={() => setForm((f) => ({ ...f, type: "income" }))}
                  className={`flex-1 py-2 rounded-lg font-body-md transition-all ${
                    form.type === "income"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  รายรับ
                </button>
                <button
                  onClick={() => setForm((f) => ({ ...f, type: "expense" }))}
                  className={`flex-1 py-2 rounded-lg font-body-md transition-all ${
                    form.type === "expense"
                      ? "bg-primary-container text-on-primary-container shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  รายจ่าย
                </button>
              </div>

              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                  วันที่ <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-secondary-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                  หมวดหมู่ <span className="text-error">*</span>
                </label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="เช่น วัตถุดิบ, ค่าแรง, รายได้จากขาย"
                  list="category-suggestions"
                  className="w-full bg-secondary-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant"
                />
                <datalist id="category-suggestions">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                  จำนวนเงิน (฿) <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body-md text-on-surface-variant">
                    ฿
                  </span>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full bg-secondary-container rounded-xl px-4 py-3 pl-8 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                  หมายเหตุ
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  rows={2}
                  className="w-full bg-secondary-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant resize-none"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="p-6 border-t border-surface-variant flex justify-end gap-3">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-6 py-2.5 rounded-xl font-body-md text-on-surface-variant hover:bg-surface-variant transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddTransaction}
                className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-body-md hover:opacity-90 transition-all"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal (unchanged) ─────────────────────────────────────────── */}
      <EditTransactionModal
        transaction={
          editingTransaction
            ? {
                id: editingTransaction.id,
                date: editingTransaction.date,
                type: editingTransaction.type,
                category: editingTransaction.category,
                amount: editingTransaction.amount,
                note: getText(editingTransaction),
              }
            : null
        }
        onClose={() => setEditingTransaction(null)}
        onSaved={refreshTransactions}
      />
    </div>
  );
}

export default TransactionsContent;
