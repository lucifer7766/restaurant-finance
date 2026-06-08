"use client";

import { useState, useEffect } from "react";
import { loadRecurringIncome, addRecurringIncome, removeRecurringIncome, type RecurringIncomeTemplate } from "@/lib/recurringIncome";

type Props = {
  onApply: (templates: RecurringIncomeTemplate[]) => void;
};

const INCOME_CATEGORIES = [
  "ยอดขายอาหาร",
  "เครื่องดื่ม",
  "เดลิเวอรี",
  "จัดเลี้ยง",
  "อื่นๆ",
];

function formatMoney(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function RecurringIncomePanel({ onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<RecurringIncomeTemplate[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ category: "ยอดขายอาหาร", amount: "", note: "" });

  useEffect(() => {
    setTemplates(loadRecurringIncome());
  }, [open]);

  function handleAdd() {
    const amt = parseFloat(form.amount);
    if (!form.category || isNaN(amt) || amt <= 0) return;
    addRecurringIncome({ category: form.category, amount: amt, note: form.note });
    setTemplates(loadRecurringIncome());
    setForm({ category: "ยอดขายอาหาร", amount: "", note: "" });
    setAdding(false);
  }

  function handleRemove(id: string) {
    removeRecurringIncome(id);
    setTemplates(loadRecurringIncome());
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-3.5 bg-surface-container rounded-xl font-body-md text-on-surface hover:bg-surface-container-high transition-colors"
      >
        <span className="material-symbols-outlined text-primary text-[20px]">repeat</span>
        <span className="flex-1 text-left">รายรับประจำ</span>
        {templates.length > 0 && (
          <span className="bg-primary text-on-primary text-xs rounded-full px-2 py-0.5 font-label-caps">
            {templates.length}
          </span>
        )}
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-lg rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="p-6 border-b border-surface-variant flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary-container text-[20px]">repeat</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">รายรับประจำ</h3>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">บันทึกซ้ำทุกเดือน</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="material-symbols-outlined p-2 hover:bg-surface-variant rounded-full text-on-surface-variant">close</button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3 overflow-y-auto flex-1">
              {templates.length === 0 && !adding && (
                <p className="font-body-md text-on-surface-variant text-center py-6">ยังไม่มีรายรับประจำ</p>
              )}
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-4 bg-surface-container rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-on-surface">{t.category}</p>
                    {t.note && <p className="font-label-caps text-label-caps text-on-surface-variant truncate">{t.note}</p>}
                  </div>
                  <span className="font-semibold text-sm text-on-surface shrink-0">฿{formatMoney(t.amount)}</span>
                  <button onClick={() => handleRemove(t.id)} className="material-symbols-outlined text-[18px] text-on-surface-variant hover:text-error transition-colors p-1">
                    delete
                  </button>
                </div>
              ))}

              {adding && (
                <div className="p-4 bg-surface-container-high rounded-xl space-y-3">
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full bg-secondary-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary"
                  >
                    {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">฿</span>
                    <input
                      type="number" min="0" step="100"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="จำนวนเงิน"
                      className="w-full bg-secondary-container rounded-xl px-4 py-3 pl-8 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant"
                    />
                  </div>
                  <input
                    type="text"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="หมายเหตุ (ไม่บังคับ)"
                    className="w-full bg-secondary-container rounded-xl px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setAdding(false)} className="flex-1 py-2.5 rounded-xl font-body-md text-on-surface-variant hover:bg-surface-variant transition-colors">
                      ยกเลิก
                    </button>
                    <button onClick={handleAdd} className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl font-body-md hover:opacity-90 transition-all">
                      เพิ่ม
                    </button>
                  </div>
                </div>
              )}

              {!adding && (
                <button
                  onClick={() => setAdding(true)}
                  className="flex items-center gap-2 w-full px-4 py-3 border-2 border-dashed border-surface-container-highest rounded-xl font-body-md text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  เพิ่มรายรับประจำ
                </button>
              )}
            </div>

            {/* Footer */}
            {templates.length > 0 && (
              <div className="p-6 border-t border-surface-variant shrink-0">
                <button
                  onClick={() => { onApply(templates); setOpen(false); }}
                  className="w-full py-3 bg-primary text-on-primary rounded-xl font-body-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  นำเข้ารายรับประจำเดือนนี้ ({templates.length} รายการ)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
