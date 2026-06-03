"use client";

import { MonthSelector } from "@/components/ui/MonthSelector";

type TopAppBarProps = {
  onToggleDrawer: () => void;
};

export function TopAppBar({ onToggleDrawer }: TopAppBarProps) {
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
        <h1 className="font-headline-md text-headline-md font-bold text-primary">
          PLU
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <MonthSelector />
      </div>
    </header>
  );
}
