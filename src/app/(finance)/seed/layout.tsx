import { DashboardShell } from "@/components/layout/DashboardShell";

export default function SeedLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell title="Seed">{children}</DashboardShell>;
}
