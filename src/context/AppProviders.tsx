"use client";

import { useEffect, useRef } from "react";
import { MonthFilterProvider, useMonthFilter } from "@/context/MonthFilterContext";
import { TransactionsProvider, useTransactions } from "@/components/transactions/TransactionsContent";

/**
 * Runs once after transactions load. If the currently-selected month has no
 * data, switches to the most recent month that does. Falls back to the
 * current month when there are no transactions at all.
 */
function SmartMonthSync() {
  const { transactions, isLoading } = useTransactions();
  const { selectedMonth, setSelectedMonth } = useMonthFilter();
  const initialized = useRef(false);

  useEffect(() => {
    if (isLoading || initialized.current) return;

    initialized.current = true;

    if (transactions.length === 0) return;

    const hasDataInSelectedMonth = transactions.some((tx) =>
      tx.date.startsWith(selectedMonth)
    );

    if (hasDataInSelectedMonth) return;

    const latestMonth = transactions
      .map((tx) => tx.date.slice(0, 7))
      .sort()
      .at(-1);

    if (latestMonth) {
      setSelectedMonth(latestMonth);
    }
  }, [isLoading, transactions, selectedMonth, setSelectedMonth]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MonthFilterProvider>
      <TransactionsProvider>
        <SmartMonthSync />
        {children}
      </TransactionsProvider>
    </MonthFilterProvider>
  );
}
