"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: "dashboard" },
  { href: "/income", label: "รายรับ", icon: "payments" },
  { href: "/expense", label: "รายจ่าย", icon: "receipt_long" },
  { href: "/reports", label: "รายงาน", icon: "leaderboard" },
  { href: "/tax", label: "ภาษี", icon: "receipt_long" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 w-full z-50 flex justify-around items-center bg-surface px-2 py-3 border-t border-surface-variant">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-0.5 transition-transform duration-200 active:scale-90 ${
              isActive
                ? "text-primary font-bold"
                : "text-on-surface-variant hover:bg-surface-container-low p-2 rounded-lg"
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-label-caps text-label-caps">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
