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
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-container-padding-mobile py-3 bg-surface border-b border-outline-variant/60" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleDrawer}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors"
          aria-label="เปิดเมนู"
        >
          <span className="material-symbols-outlined text-on-surface">menu</span>
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[18px]">restaurant</span>
          </div>
          <div>
            <h1 className="text-[17px] font-extrabold text-primary leading-tight tracking-tight" style={{ fontFamily: "var(--font-manrope)" }}>
              Slipless
            </h1>
            {pageLabel && (
              <p className="font-label-caps text-label-caps text-on-surface-variant leading-none">
                {pageLabel}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <MonthSelector />
      </div>
    </header>
  );
}
