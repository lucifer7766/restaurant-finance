"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PinSettings } from "@/components/ui/PinSettings";

const navItems = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: "dashboard" },
  { href: "/income", label: "รายรับ", icon: "payments" },
  { href: "/expense", label: "รายจ่าย", icon: "receipt_long" },
  { href: "/reports", label: "รายงานกำไร", icon: "leaderboard" },
  { href: "/cost-analysis", label: "วิเคราะห์ต้นทุน", icon: "analytics" },
];

type AppSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    onClose();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-[59] bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-[60] flex flex-col p-4 bg-surface-container-low h-full w-72 rounded-r-xl shadow-md transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header row: Brand + Close button */}
        <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined">restaurant</span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md font-bold text-primary leading-tight">
                PLU
              </h2>
              <p className="font-label-caps text-label-caps text-on-surface-variant">Restaurant Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors shrink-0"
            aria-label="ปิดเมนู"
          >
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-outline-variant pt-4 flex flex-col gap-2">
          {user && (
            <p className="px-2 text-xs text-on-surface-variant truncate">
              {user.email}
            </p>
          )}
          <PinSettings />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors w-full text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>
    </>
  );
}
