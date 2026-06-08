"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PinSettings } from "@/components/ui/PinSettings";
import { useRestaurantName } from "@/lib/restaurantSettings";

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
  const [restaurantName, setRestaurantName] = useRestaurantName();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

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
        aria-hidden={!isOpen}
        {...(!isOpen ? ({ inert: true } as unknown as React.HTMLAttributes<HTMLElement>) : {})}
        className={`fixed inset-y-0 left-0 z-[60] flex flex-col h-full w-72 rounded-r-2xl overflow-hidden transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ boxShadow: "4px 0 32px rgba(0,0,0,0.18)" }}
      >
        {/* Brand header — dark green zone */}
        <div
          style={{ background: "linear-gradient(135deg, #115637 0%, #1a7a4e 100%)", padding: "20px 16px 24px" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)" }}
              >
                <span className="material-symbols-outlined text-white text-[24px]">restaurant</span>
              </div>
              <div>
                <h2 style={{ fontFamily: "var(--font-manrope)", fontSize: "22px", fontWeight: 800, color: "#ffffff", lineHeight: 1.2 }}>
                  Slipless
                </h2>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.70)", fontWeight: 500, letterSpacing: "0.03em" }}>
                  Restaurant Finance
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
              style={{ background: "rgba(255,255,255,0.15)" }}
              aria-label="ปิดเมนู"
            >
              <span className="material-symbols-outlined text-white">close</span>
            </button>
          </div>
        </div>

        {/* Nav links — light cream body */}
        <div className="flex-1 flex flex-col overflow-y-auto" style={{ background: "#f7f4ef", padding: "12px 12px 0" }}>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                  style={
                    isActive
                      ? { background: "#115637", color: "#ffffff", fontWeight: 700, boxShadow: "0 2px 8px rgba(17,86,55,0.30)" }
                      : { color: "#404942" }
                  }
                >
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={isActive ? { color: "#acefc6" } : { color: "#115637" }}
                  >
                    {item.icon}
                  </span>
                  <span style={{ fontSize: "15px" }}>{item.label}</span>
                  {isActive && (
                    <span className="material-symbols-outlined text-[16px] ml-auto" style={{ color: "#acefc6" }}>
                      chevron_right
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User + Logout — footer */}
        <div style={{ background: "#f0ede6", borderTop: "1px solid #d8d3ca", padding: "12px" }}>

          {/* ── ชื่อร้าน ── */}
          <div className="px-3 mb-3">
            {editingName ? (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { setRestaurantName(nameInput); setEditingName(false); }
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  maxLength={40}
                  className="flex-1 text-sm rounded-lg px-2 py-1.5 border border-outline-variant bg-surface outline-none focus:border-primary"
                  placeholder="ชื่อร้านอาหาร"
                  style={{ fontSize: "13px" }}
                />
                <button
                  onClick={() => { setRestaurantName(nameInput); setEditingName(false); }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "#115637", color: "#fff" }}
                >
                  บันทึก
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setNameInput(restaurantName); setEditingName(true); }}
                className="flex items-center gap-1.5 w-full group"
              >
                <span className="material-symbols-outlined text-[14px]" style={{ color: "#115637" }}>storefront</span>
                <span className="flex-1 text-left truncate" style={{ fontSize: "12px", color: "#404942", fontWeight: 600 }}>
                  {restaurantName}
                </span>
                <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: "#404942" }}>
                  edit
                </span>
              </button>
            )}
          </div>

          {user && (
            <p className="px-3 mb-2 truncate" style={{ fontSize: "11px", color: "#707972" }}>
              {user.email}
            </p>
          )}
          <PinSettings />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-colors hover:bg-white/60"
            style={{ color: "#404942", fontSize: "15px" }}
          >
            <span className="material-symbols-outlined text-[22px]" style={{ color: "#ba1a1a" }}>logout</span>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>
    </>
  );
}
