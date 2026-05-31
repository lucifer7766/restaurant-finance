import { DashboardShell } from "@/components/layout/DashboardShell";

export default function TransactionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell title="Transactions">{children}</DashboardShell>;
}
