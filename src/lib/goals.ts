const STORAGE_KEY = "slipless_goals_v1";

export type MonthGoal = {
  income: number;   // เป้ารายรับ
  expense: number;  // เป้ารายจ่าย (บน = ไม่เกิน)
  profit: number;   // เป้ากำไร
};

export type GoalsMap = Record<string, MonthGoal>; // key = "YYYY-MM"

export function loadGoals(): GoalsMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function getGoal(monthKey: string): MonthGoal | null {
  return loadGoals()[monthKey] ?? null;
}

export function setGoal(monthKey: string, goal: MonthGoal): void {
  const all = loadGoals();
  all[monthKey] = goal;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function removeGoal(monthKey: string): void {
  const all = loadGoals();
  delete all[monthKey];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
