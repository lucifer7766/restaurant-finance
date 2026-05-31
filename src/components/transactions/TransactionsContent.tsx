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
import EditTransactionModal from "./EditTransactionModal";
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

function getText(transaction: AppTransaction) {
  return transaction.note || transaction.description || "-";
}

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

export function TransactionsContent() {
  const { transactions, isLoading, error, addTransaction, deleteTransaction, refreshTransactions } =
    useTransactions();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
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
      alert("กรอกข้อมูลให้ครบก่อน");
      return;
    }

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
  }

  async function handleDelete(id: string) {
    const ok = confirm("ต้องการลบรายการนี้ใช่ไหม?");
    if (!ok) return;

    await deleteTransaction(id);
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

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `restaurant-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
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
      `restaurant-transactions-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Transactions</h2>
          <p className="text-sm text-zinc-400">จัดการรายรับรายจ่ายทั้งหมด</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
          >
            Export CSV
          </button>

          <button
            onClick={handleExportExcel}
            className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-900/30"
          >
            Export Excel
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
          >
            + Add Transaction
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | TransactionType)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
        >
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900 text-zinc-300">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  Loading transactions...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  No transactions found
                </td>
              </tr>
            ) : (
              filteredTransactions.map((item) => (
                <tr key={item.id} className="border-b border-zinc-900 text-zinc-200">
                  <td className="px-4 py-3">{item.date}</td>
                  <td className="px-4 py-3">{getText(item)}</td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        item.type === "income"
                          ? "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300"
                          : "rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-300"
                      }
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatBaht(item.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingTransaction(item)}
                      className="mr-3 text-xs text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAddOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl bg-white p-6 text-black shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Add Transaction</h3>

            <div className="space-y-3">
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />

              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>

              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Category"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />

              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Amount"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />

              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Note"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setIsAddOpen(false)} className="rounded-lg border px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={handleAddTransaction}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

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