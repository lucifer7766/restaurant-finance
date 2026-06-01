export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyPrecise(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatBaht(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const categoryLabels: Record<string, string> = {
  Sales: "รายได้",
  COGS: "ต้นทุนขาย",
  Operations: "ค่าใช้จ่ายดำเนินงาน",
  // Thai expense categories — normalize any spacing variants
  "วัตถุดิบ": "วัตถุดิบ",
  "วัตถุ ดิบ": "วัตถุดิบ",
  "ค่าแรง": "ค่าแรง",
  "ค่า แรง": "ค่าแรง",
  "ค่าเช่า": "ค่าเช่า",
  "ค่า เช่า": "ค่าเช่า",
  "ค่าน้ำค่าไฟ": "ค่าน้ำค่าไฟ",
  "ค่าน้ำ ค่าไฟ": "ค่าน้ำค่าไฟ",
  "ค่า น้ำ ค่า ไฟ": "ค่าน้ำค่าไฟ",
  "การตลาด": "การตลาด",
  "บรรจุภัณฑ์": "บรรจุภัณฑ์",
  "บรรจุ ภัณฑ์": "บรรจุภัณฑ์",
  "ซ่อมบำรุง": "ซ่อมบำรุง",
  "ซ่อม บำรุง": "ซ่อมบำรุง",
  "อื่นๆ": "อื่นๆ",
  // Thai income categories
  "ยอดขายอาหาร": "ยอดขายอาหาร",
  "ยอดขายเครื่องดื่ม": "ยอดขายเครื่องดื่ม",
  "เดลิเวอรี": "เดลิเวอรี",
  "จัดเลี้ยง": "จัดเลี้ยง",
};

export function getCategoryLabel(category: string): string {
  if (!category) return "-";
  const trimmed = category.trim();
  return categoryLabels[trimmed] ?? trimmed;
}

export const transactionTypeLabels: Record<"income" | "expense", string> = {
  income: "รายรับ",
  expense: "รายจ่าย",
};

export function formatTransactionDate(date: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(year), Number(month) - 1, 1));
}

export const selectClassName =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500";
