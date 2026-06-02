const STORAGE_KEY = "plu_budgets_v1";

export type BudgetMap = Record<string, number>; // category → monthly budget (฿)

export function loadBudgets(): BudgetMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveBudgets(budgets: BudgetMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
}

export function getBudget(category: string): number {
  return loadBudgets()[category] ?? 0;
}

export function setBudget(category: string, amount: number): void {
  const budgets = loadBudgets();
  if (amount <= 0) {
    delete budgets[category];
  } else {
    budgets[category] = amount;
  }
  saveBudgets(budgets);
}
