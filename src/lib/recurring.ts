const STORAGE_KEY = "plu_recurring_v1";

export type RecurringTemplate = {
  id: string;
  category: string;
  amount: number;
  note: string;
};

export function loadRecurring(): RecurringTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveRecurring(templates: RecurringTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function addRecurring(t: Omit<RecurringTemplate, "id">): RecurringTemplate {
  const templates = loadRecurring();
  const newT: RecurringTemplate = { ...t, id: crypto.randomUUID() };
  templates.push(newT);
  saveRecurring(templates);
  return newT;
}

export function removeRecurring(id: string): void {
  saveRecurring(loadRecurring().filter((t) => t.id !== id));
}
