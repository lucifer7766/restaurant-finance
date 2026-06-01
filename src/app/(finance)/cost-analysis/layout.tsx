import { DashboardShell } from "@/components/layout/DashboardShell";

export default function CostAnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell title="Cost Analysis">{children}</DashboardShell>;
}
