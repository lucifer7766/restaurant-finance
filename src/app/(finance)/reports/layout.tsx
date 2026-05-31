import { DashboardShell } from "@/components/layout/DashboardShell";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell title="Reports">{children}</DashboardShell>;
}
