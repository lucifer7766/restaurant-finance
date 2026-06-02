import type { RecentTransaction } from "@/lib/data";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { getSupabaseClient } from "@/lib/supabase/client";

export type DbTransaction = {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note: string | null;
  created_at: string;
};

export type NewTransaction = {
  date: string;
  type: string;
  category: string;
  amount: number;
  note: string;
};

type InsertPayload = {
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note: string | null;
};

const TYPE_VALUES = {
  income: "income",
  expense: "expense",
  "รายรับ": "income",
  "รายจ่าย": "expense",
} as const;

function normalizeTransactionType(type: string): "income" | "expense" {
  const normalized = TYPE_VALUES[type.trim() as keyof typeof TYPE_VALUES];

  if (!normalized) {
    throw new Error(`Invalid type "${type}". Must be "income" or "expense".`);
  }

  return normalized;
}

function normalizeDate(date: string): string {
  const match = date.trim().match(/^(\d{4}-\d{2}-\d{2})/);

  if (!match) {
    throw new Error(`Invalid date "${date}". Use YYYY-MM-DD format.`);
  }

  return match[1];
}

function prepareInsertPayload(transaction: NewTransaction): InsertPayload {
  const amount = Number(transaction.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a number greater than 0.");
  }

  const category = String(transaction.category).trim();

  if (!category) {
    throw new Error("Category is required.");
  }

  const note = transaction.note.trim();

  return {
    date: normalizeDate(transaction.date),
    type: normalizeTransactionType(transaction.type),
    category,
    amount,
    note: note.length > 0 ? note : null,
  };
}

function mapDbTransaction(row: DbTransaction): RecentTransaction {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    category: row.category,
    amount: Number(row.amount),
    description: row.note ?? "",
  };
}

export async function fetchTransactions(): Promise<RecentTransaction[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("transactions")
    .select("id, date, type, category, amount, note, created_at")
    .order("date", { ascending: false });

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return (data ?? []).map(mapDbTransaction);
}

export async function insertTransaction(transaction: NewTransaction): Promise<void> {
  const supabase = getSupabaseClient();
  const payload = prepareInsertPayload(transaction);

  const { error } = await supabase.from("transactions").insert(payload);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
}
export async function updateTransaction(
  id: string,
  transaction: Partial<NewTransaction>
) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("transactions")
    .update(transaction)
    .eq("id", id);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
}
export async function deleteTransaction(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const result = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .select("*");

  if (result.error) {
    throw new Error(formatSupabaseError(result.error));
  }
}