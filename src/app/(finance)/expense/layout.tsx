import { DashboardShell } from "@/components/layout/DashboardShell";

export default function ExpenseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell title="Expense">{children}</DashboardShell>;
}
