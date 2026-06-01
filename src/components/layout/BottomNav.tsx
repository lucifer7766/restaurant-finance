"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: "dashboard" },
  { href: "/transactions", label: "รายการ", icon: "receipt_long" },
  { href: "/reports", label: "รายงาน", icon: "leaderboard" },
  { href: "/cost-analysis", label: "ต้นทุน", icon: "analytics" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

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
      <button
        onClick={handleSignOut}
        className="flex flex-col items-center justify-center gap-0.5 text-on-surface-variant hover:bg-surface-container-low p-2 rounded-lg transition-transform duration-200 active:scale-90"
      >
        <span className="material-symbols-outlined">logout</span>
        <span className="font-label-caps text-label-caps">ออกจากระบบ</span>
      </button>
    </nav>
  );
}
