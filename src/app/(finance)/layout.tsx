import { AppProviders } from "@/context/AppProviders";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppProviders>{children}</AppProviders>;
}
