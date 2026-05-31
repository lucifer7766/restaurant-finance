"use client";

import { MonthFilterProvider } from "@/context/MonthFilterContext";
import { TransactionsProvider } from "@/components/transactions/TransactionsContent";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MonthFilterProvider>
      <TransactionsProvider>{children}</TransactionsProvider>
    </MonthFilterProvider>
  );
}
