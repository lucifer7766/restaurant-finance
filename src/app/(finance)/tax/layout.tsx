import { DashboardShell } from "@/components/layout/DashboardShell";

export default function TaxLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell title="ภาษี">{children}</DashboardShell>;
}
