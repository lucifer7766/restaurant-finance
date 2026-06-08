const STORAGE_KEY = "slipless_recurring_income_v1";

export type RecurringIncomeTemplate = {
  id: string;
  category: string;
  amount: number;
  note: string;
};

export function loadRecurringIncome(): RecurringIncomeTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveRecurringIncome(templates: RecurringIncomeTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function addRecurringIncome(t: Omit<RecurringIncomeTemplate, "id">): RecurringIncomeTemplate {
  const templates = loadRecurringIncome();
  const newT: RecurringIncomeTemplate = { ...t, id: crypto.randomUUID() };
  templates.push(newT);
  saveRecurringIncome(templates);
  return newT;
}

export function removeRecurringIncome(id: string): void {
  saveRecurringIncome(loadRecurringIncome().filter((t) => t.id !== id));
}
