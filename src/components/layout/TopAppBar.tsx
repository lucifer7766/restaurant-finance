"use client";

import { MonthSelector } from "@/components/ui/MonthSelector";

const PAGE_TITLES: Record<string, string> = {
  Dashboard: "แดชบอร์ด",
  Income: "รายรับ",
  Expense: "รายจ่าย",
  Reports: "รายงาน",
  "Cost Analysis": "วิเคราะห์ต้นทุน",
  Transactions: "รายการทั้งหมด",
};

type TopAppBarProps = {
  onToggleDrawer: () => void;
  title?: string;
};

export function TopAppBar({ onToggleDrawer, title }: TopAppBarProps) {
  const pageLabel = title ? (PAGE_TITLES[title] ?? title) : null;

  return (
    <header
      className="fixed top-0 w-full z-50 bg-white"
      style={{
        boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
        borderBottom: "1px solid rgba(17,86,55,0.12)",
      }}
    >
      {/* Green accent line at very top */}
      <div style={{ height: "3px", background: "linear-gradient(90deg, #115637 0%, #1a7a4e 60%, #93d5ad 100%)" }} />

      <div className="flex justify-between items-center px-container-padding-mobile py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleDrawer}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
            style={{ background: "rgba(17,86,55,0.07)" }}
            aria-label="เปิดเมนู"
          >
            <span className="material-symbols-outlined" style={{ color: "#115637" }}>menu</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #115637 0%, #1a7a4e 100%)", boxShadow: "0 2px 8px rgba(17,86,55,0.30)" }}
            >
              <span className="material-symbols-outlined text-white text-[20px]">restaurant</span>
            </div>

            {/* Brand text */}
            <div>
              <h1
                className="leading-tight tracking-tight"
                style={{ fontFamily: "var(--font-manrope)", fontSize: "20px", fontWeight: 800, color: "#115637" }}
              >
                Slipless
              </h1>
              <p style={{ fontSize: "10px", fontWeight: 500, color: "#707972", letterSpacing: "0.04em" }}>
                {pageLabel ? pageLabel : "Restaurant Finance"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MonthSelector />
        </div>
      </div>
    </header>
  );
}
