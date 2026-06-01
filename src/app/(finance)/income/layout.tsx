import { DashboardShell } from "@/components/layout/DashboardShell";

export default function IncomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell title="Income">{children}</DashboardShell>;
}
