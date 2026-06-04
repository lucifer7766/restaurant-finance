"use client";

import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopAppBar } from "./TopAppBar";

type DashboardShellProps = {
  title: string;
  children: React.ReactNode;
};

export function DashboardShell({ title, children }: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="canvas-bg min-h-screen">
      <TopAppBar onToggleDrawer={() => setDrawerOpen((v) => !v)} title={title} />
      <AppSidebar isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main className="max-w-[1280px] mx-auto px-container-padding-mobile md:px-container-padding-desktop pt-28 pb-8">
        {children}
      </main>
    </div>
  );
}
