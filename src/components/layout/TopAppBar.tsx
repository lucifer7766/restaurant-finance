"use client";

import { MonthSelector } from "@/components/ui/MonthSelector";

export function TopAppBar() {
  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-container-padding-mobile py-4 bg-surface shadow-sm lg:pl-[calc(18rem+1rem)]">
      <h1 className="font-headline-md text-headline-md font-bold text-primary lg:hidden">
        PLU
      </h1>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3">
        <MonthSelector />
      </div>
    </header>
  );
}
