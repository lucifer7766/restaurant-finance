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
  // English POS income categories → Thai
  "Food Sales": "ยอดขายอาหาร",
  "Beverage": "ยอดขายเครื่องดื่ม",
  "Beverages": "ยอดขายเครื่องดื่ม",
  "Delivery": "เดลิเวอรี",
  "Catering": "จัดเลี้ยง",
  "Other": "อื่นๆ",
  "Others": "อื่นๆ",
  // English expense categories → Thai
  "Ingredients": "วัตถุดิบ",
  "วัตถุดิบ (Ingredients)": "วัตถุดิบ",
  "Rent": "ค่าเช่า",
  "Labor": "ค่าแรง",
  "Utilities": "ค่าน้ำค่าไฟ",
  "Packaging": "บรรจุภัณฑ์",
  "Marketing": "การตลาด",
  // Thai expense categories — normalize spacing variants
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

export type CategoryMeta = { icon: string; iconColor: string; bg: string };

const CATEGORY_META_MAP: Record<string, CategoryMeta> = {
  // Expense
  วัตถุดิบ:    { icon: "grocery",       iconColor: "text-on-primary-container",      bg: "bg-primary-container" },
  ค่าแรง:      { icon: "groups",         iconColor: "text-on-tertiary-fixed-variant", bg: "bg-tertiary-container" },
  ค่าเช่า:     { icon: "home",           iconColor: "text-on-secondary-container",    bg: "bg-secondary-container" },
  ค่าน้ำค่าไฟ: { icon: "electric_bolt",  iconColor: "text-error",                     bg: "bg-error-container" },
  การตลาด:     { icon: "campaign",       iconColor: "text-on-primary-container",      bg: "bg-primary-fixed" },
  ซ่อมบำรุง:   { icon: "build",          iconColor: "text-on-surface-variant",        bg: "bg-surface-container-high" },
  บรรจุภัณฑ์:  { icon: "package_2",      iconColor: "text-on-surface-variant",        bg: "bg-surface-container-high" },
  // Income
  ยอดขายอาหาร:      { icon: "restaurant",      iconColor: "text-on-surface-variant",        bg: "bg-surface-container-high" },
  ยอดขายเครื่องดื่ม: { icon: "local_bar",       iconColor: "text-error",                     bg: "bg-error-container" },
  เดลิเวอรี:         { icon: "delivery_dining", iconColor: "text-on-surface-variant",        bg: "bg-surface-container-high" },
  จัดเลี้ยง:         { icon: "event",           iconColor: "text-on-primary-container",      bg: "bg-primary-container" },
};

const DEFAULT_META: CategoryMeta = { icon: "receipt_long", iconColor: "text-on-surface-variant", bg: "bg-surface-container-high" };

export function getCategoryMeta(category: string): CategoryMeta {
  const label = getCategoryLabel(category);
  return CATEGORY_META_MAP[label] ?? CATEGORY_META_MAP[category] ?? DEFAULT_META;
}

export function getCategoryIcon(category: string): string {
  return getCategoryMeta(category).icon;
}

/** แปลง POS note → "POS · หมวดหมู่ไทย · ช่องทางชำระเงิน" */
export function formatPosNote(description: string, category: string): string {
  const thaiCat = getCategoryLabel(category);
  // อ่าน method: ที่บันทึกต่อ category (format ใหม่)
  const methodMatch = description.match(/method:([^|]+)/);
  if (methodMatch) {
    const method = methodMatch[1].trim();
    return `POS · ${thaiCat} · ${method}`;
  }
  // fallback format เก่า — ใช้ช่องทางที่มียอดสูงสุด
  const payMatch = description.match(/pay:([^\s]+)/);
  if (!payMatch) return `POS · ${thaiCat}`;
  const top = payMatch[1]
    .split(",")
    .map((p) => { const [k, v] = p.split("="); return { k, v: Number(v) }; })
    .filter((p) => p.v > 0)
    .sort((a, b) => b.v - a.v)[0];
  return top ? `POS · ${thaiCat} · ${top.k}` : `POS · ${thaiCat}`;
}

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
