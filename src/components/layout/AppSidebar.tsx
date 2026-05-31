"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: "dashboard" },
  { href: "/transactions", label: "รายการ", icon: "receipt_long" },
  { href: "/reports", label: "รายงานกำไร", icon: "leaderboard" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside
      id="desktopSidebar"
      className="hidden lg:flex fixed inset-y-0 left-0 z-[60] flex-col p-4 bg-surface-container-low h-full w-72 rounded-r-xl shadow-md"
    >
      {/* Brand */}
      <div className="flex items-center gap-4 mb-10 px-2">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-on-primary">
          <span className="material-symbols-outlined">restaurant</span>
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md font-bold text-primary">
            PLU
          </h2>
          <p className="text-sm text-on-surface-variant">Finance System</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-semibold scale-95"
                  : "text-on-surface-variant hover:bg-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
