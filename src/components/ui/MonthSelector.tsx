"use client";

import { useMonthFilter } from "@/context/MonthFilterContext";
import { formatMonthLabel } from "@/lib/utils";

const START_YEAR = 2025;
const END_YEAR = 2030;

const MIN_MONTH = `${START_YEAR}-01`;
const MAX_MONTH = `${END_YEAR}-12`;

export function MonthSelector() {
  const { selectedMonth, setSelectedMonth } = useMonthFilter();

  return (
    <div className="flex flex-col items-end gap-0.5">
      <input
        id="month-filter"
        type="month"
        min={MIN_MONTH}
        max={MAX_MONTH}
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="bg-surface-container rounded-xl px-3 py-2 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary border-none cursor-pointer"
      />
      <p className="font-label-caps text-label-caps text-on-surface-variant pr-1">
        {formatMonthLabel(selectedMonth)}
      </p>
    </div>
  );
}
