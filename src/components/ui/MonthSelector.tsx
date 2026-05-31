"use client";

import { useMonthFilter } from "@/context/MonthFilterContext";
import { formatMonthLabel, selectClassName } from "@/lib/utils";

const labelClassName = "mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export function MonthSelector() {
  const { selectedMonth, setSelectedMonth } = useMonthFilter();

  return (
    <div className="max-w-xs">
      <label htmlFor="month-filter" className={labelClassName}>
        Month
      </label>
      <input
        id="month-filter"
        type="month"
        min="2026-01"
        max="2026-12"
        value={selectedMonth}
        onChange={(event) => setSelectedMonth(event.target.value)}
        className={selectClassName}
      />
      <p className="mt-1 text-xs text-zinc-400">Showing {formatMonthLabel(selectedMonth)}</p>
    </div>
  );
}
