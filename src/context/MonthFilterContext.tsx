"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { defaultSelectedMonth } from "@/lib/data";
import { fetchAvailableMonths } from "@/lib/supabase/transactions";

const STORAGE_KEY = "restaurant-finance-selected-month";

type MonthFilterContextValue = {
  selectedMonth: string;
  setSelectedMonth: (monthKey: string) => void;
  availableMonths: string[];
};

const MonthFilterContext = createContext<MonthFilterContextValue | null>(null);

export function MonthFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState(defaultSelectedMonth);
  const [availableMonths, setAvailableMonths] = useState<string[]>([defaultSelectedMonth]);

  useEffect(() => {
    const savedMonth = localStorage.getItem(STORAGE_KEY);
    if (savedMonth) {
      setSelectedMonth(savedMonth);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    fetchAvailableMonths()
      .then((months) => {
        setAvailableMonths(months);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && months.includes(saved)) {
          setSelectedMonth(saved);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <MonthFilterContext.Provider value={{ selectedMonth, setSelectedMonth, availableMonths }}>
      {children}
    </MonthFilterContext.Provider>
  );
}

export function useMonthFilter() {
  const context = useContext(MonthFilterContext);

  if (!context) {
    throw new Error("useMonthFilter must be used inside MonthFilterProvider");
  }

  return context;
}
