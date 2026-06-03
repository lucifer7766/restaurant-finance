"use client";

import { useMonthFilter } from "@/context/MonthFilterContext";
import { formatMonthLabel } from "@/lib/utils";

export function MonthSelector() {
  const { selectedMonth, setSelectedMonth, availableMonths } = useMonthFilter();

  const currentIndex = availableMonths.indexOf(selectedMonth);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < availableMonths.length - 1;

  function goPrev() {
    if (canGoPrev) setSelectedMonth(availableMonths[currentIndex - 1]);
  }

  function goNext() {
    if (canGoNext) setSelectedMonth(availableMonths[currentIndex + 1]);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={goPrev}
        disabled={!canGoPrev}
        className="p-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="เดือนก่อนหน้า"
      >
        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
      </button>

      <span className="font-body-md text-on-surface min-w-[6rem] text-center select-none">
        {formatMonthLabel(selectedMonth)}
      </span>

      <button
        onClick={goNext}
        disabled={!canGoNext}
        className="p-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="เดือนถัดไป"
      >
        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
      </button>
    </div>
  );
}
