"use client";

import Link from "next/link";
import { useMonthFilter } from "@/context/MonthFilterContext";
import { formatMonthLabel } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/reports", label: "Reports" },
];

type DashboardShellProps = {
  title: string;
  children: React.ReactNode;
};

function DashboardHeader({ title }: { title: string }) {
  const { selectedMonth } = useMonthFilter();

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <p className="text-xs font-medium tracking-wider text-zinc-400">
          Restaurant Finance System
        </p>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {formatMonthLabel(selectedMonth)}
      </p>
    </header>
  );
}

function DashboardShellInner({ title, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:block">
        <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            PLU
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader title={title} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

export function DashboardShell({ title, children }: DashboardShellProps) {
  return <DashboardShellInner title={title}>{children}</DashboardShellInner>;
}
