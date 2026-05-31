"use client";

import { AppSidebar } from "./AppSidebar";
import { TopAppBar } from "./TopAppBar";
import { BottomNav } from "./BottomNav";

type DashboardShellProps = {
  title: string;
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="canvas-bg min-h-screen pb-24 md:pb-0">
      <TopAppBar />
      <AppSidebar />
      <main className="lg:ml-72 max-w-[1280px] mx-auto px-container-padding-mobile md:px-container-padding-desktop pt-24 pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
