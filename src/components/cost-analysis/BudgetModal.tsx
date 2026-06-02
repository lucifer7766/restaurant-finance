"use client";

import { useState, useEffect } from "react";
import { loadBudgets, saveBudgets, type BudgetMap } from "@/lib/budget";

type Props = {
  categories: string[];
  onClose: () => void;
};

function formatMoney(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function BudgetModal({ categories, onClose }: Props) {
  const [budgets, setBudgets] = useState<BudgetMap>({});

  useEffect(() => {
    setBudgets(loadBudgets());
  }, []);

  function handleChange(cat: string, val: string) {
    const num = parseFloat(val.replace(/,/g, ""));
    setBudgets((prev) => ({ ...prev, [cat]: isNaN(num) ? 0 : num }));
  }

  function handleSave() {
    saveBudgets(budgets);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-surface-variant flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container text-[20px]">savings</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">ตั้งงบประมาณ</h3>
              <p className="font-label-caps text-label-caps text-on-surface-variant">งบต่อเดือนแต่ละหมวดหมู่</p>
            </div>
          </div>
          <button onClick={onClose} className="material-symbols-outlined p-2 hover:bg-surface-variant rounded-full text-on-surface-variant">
            close
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {categories.length === 0 && (
            <p className="font-body-md text-on-surface-variant text-center py-8">ยังไม่มีหมวดหมู่ค่าใช้จ่าย</p>
          )}
          {categories.map((cat) => (
            <div key={cat}>
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">{cat}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body-md text-on-surface-variant">฿</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={budgets[cat] || ""}
                  onChange={(e) => handleChange(cat, e.target.value)}
                  placeholder="0 = ไม่ตั้งงบ"
                  className="w-full bg-secondary-container rounded-xl px-4 py-3 pl-8 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant"
                />
                {(budgets[cat] ?? 0) > 0 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-label-caps text-label-caps text-on-surface-variant">
                    ฿{formatMoney(budgets[cat])}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-surface-variant flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-body-md text-on-surface-variant hover:bg-surface-variant transition-colors">
            ยกเลิก
          </button>
          <button onClick={handleSave} className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-body-md hover:opacity-90 transition-all">
            บันทึกงบประมาณ
          </button>
        </div>
      </div>
    </div>
  );
}
