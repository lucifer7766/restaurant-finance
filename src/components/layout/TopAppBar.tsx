"use client";

import { MonthSelector } from "@/components/ui/MonthSelector";

const PAGE_TITLES: Record<string, string> = {
  Dashboard: "แดชบอร์ด",
  Income: "รายรับ",
  Expense: "รายจ่าย",
  Reports: "รายงาน",
  "Cost Analysis": "วิเคราะห์ต้นทุน",
  Transactions: "รายการทั้งหมด",
};

type TopAppBarProps = {
  onToggleDrawer: () => void;
  title?: string;
};

export function TopAppBar({ onToggleDrawer, title }: TopAppBarProps) {
  const pageLabel = title ? (PAGE_TITLES[title] ?? title) : null;

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-container-padding-mobile py-4 bg-surface shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleDrawer}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors"
          aria-label="เปิดเมนู"
        >
          <span className="material-symbols-outlined text-on-surface">menu</span>
        </button>
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-primary leading-tight">
            PLU
          </h1>
          {pageLabel && (
            <p className="font-label-caps text-label-caps text-on-surface-variant leading-none">
              {pageLabel}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <MonthSelector />
      </div>
    </header>
  );
}
