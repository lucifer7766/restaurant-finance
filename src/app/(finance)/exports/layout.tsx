import { DashboardShell } from "@/components/layout/DashboardShell";

export default function ExportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell title="Exports">{children}</DashboardShell>;
}
