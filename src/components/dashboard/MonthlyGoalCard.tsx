"use client";

import { useState, useEffect } from "react";
import { getGoal, setGoal, removeGoal, type MonthGoal } from "@/lib/goals";
import { formatMonthLabel } from "@/lib/utils";

type Props = {
  monthKey: string;
  actualIncome: number;
  actualExpense: number;
  actualProfit: number;
};

function formatMoney(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function GoalBar({
  label,
  actual,
  target,
  colorClass,
  inverse = false,
}: {
  label: string;
  actual: number;
  target: number;
  colorClass: string;
  inverse?: boolean;
}) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  const reached = inverse ? actual <= target : actual >= target;
  const overBudget = inverse && target > 0 && actual > target;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-body-md text-on-surface text-sm">{label}</span>
        <div className="text-right">
          <span className={`font-semibold text-sm ${reached ? "text-primary" : overBudget ? "text-error" : "text-on-surface"}`}>
            ฿{formatMoney(actual)}
          </span>
          <span className="font-label-caps text-label-caps text-on-surface-variant ml-1">/ ฿{formatMoney(target)}</span>
        </div>
      </div>
      <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${overBudget ? "bg-error" : colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-1 font-label-caps text-label-caps text-xs ${reached ? "text-primary" : overBudget ? "text-error" : "text-on-surface-variant"}`}>
        {overBudget
          ? `เกินเป้า ฿${formatMoney(actual - target)}`
          : reached
          ? "✓ ถึงเป้าแล้ว"
          : `เหลืออีก ฿${formatMoney(target - actual)} (${(100 - pct).toFixed(0)}%)`}
      </p>
    </div>
  );
}

export function MonthlyGoalCard({ monthKey, actualIncome, actualExpense, actualProfit }: Props) {
  const [goal, setGoalState] = useState<MonthGoal | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ income: "", expense: "", profit: "" });

  useEffect(() => {
    setGoalState(getGoal(monthKey));
  }, [monthKey]);

  function handleOpen() {
    if (goal) {
      setForm({
        income: goal.income > 0 ? String(goal.income) : "",
        expense: goal.expense > 0 ? String(goal.expense) : "",
        profit: goal.profit > 0 ? String(goal.profit) : "",
      });
    } else {
      setForm({ income: "", expense: "", profit: "" });
    }
    setEditing(true);
  }

  function handleSave() {
    const inc = Number(form.income) || 0;
    const exp = Number(form.expense) || 0;
    const pro = Number(form.profit) || 0;
    if (inc === 0 && exp === 0 && pro === 0) return;
    const g: MonthGoal = { income: inc, expense: exp, profit: pro };
    setGoal(monthKey, g);
    setGoalState(g);
    setEditing(false);
  }

  function handleRemove() {
    removeGoal(monthKey);
    setGoalState(null);
    setEditing(false);
  }

  const monthLabel = formatMonthLabel(monthKey);

  return (
    <>
      <div className="metric-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary-container text-[20px]">flag</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">เป้าหมายเดือนนี้</h3>
              <p className="font-label-caps text-label-caps text-on-surface-variant">{monthLabel}</p>
            </div>
          </div>
          <button
            onClick={handleOpen}
            className="p-2 rounded-xl hover:bg-surface-container transition-colors"
            title={goal ? "แก้ไขเป้าหมาย" : "ตั้งเป้าหมาย"}
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
              {goal ? "edit" : "add_circle"}
            </span>
          </button>
        </div>

        {!goal ? (
          <button
            onClick={handleOpen}
            className="w-full flex items-center justify-center gap-2 py-6 border-2 border-dashed border-surface-container-highest rounded-xl font-body-md text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            ตั้งเป้าหมายประจำเดือน
          </button>
        ) : (
          <div className="space-y-4">
            {goal.income > 0 && (
              <GoalBar label="รายรับ" actual={actualIncome} target={goal.income} colorClass="bg-primary" />
            )}
            {goal.expense > 0 && (
              <GoalBar label="รายจ่าย (ไม่เกิน)" actual={actualExpense} target={goal.expense} colorClass="bg-tertiary" inverse />
            )}
            {goal.profit > 0 && (
              <GoalBar label="กำไร" actual={actualProfit} target={goal.profit} colorClass="bg-primary" />
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
          <div className="w-full sm:max-w-md bg-surface sm:rounded-3xl rounded-t-3xl shadow-2xl">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">ตั้งเป้าหมาย</h3>
                <p className="font-label-caps text-label-caps text-on-surface-variant">{monthLabel}</p>
              </div>
              <button onClick={() => setEditing(false)} className="p-2 rounded-xl hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4">
              <p className="font-label-caps text-label-caps text-on-surface-variant">กรอกเฉพาะที่ต้องการตั้งเป้า ไม่ต้องกรอกทุกช่อง</p>

              {[
                { key: "income", label: "เป้ารายรับ (บาท)", placeholder: "เช่น 150000" },
                { key: "expense", label: "รายจ่ายสูงสุด (บาท)", placeholder: "เช่น 80000" },
                { key: "profit", label: "เป้ากำไร (บาท)", placeholder: "เช่น 50000" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">{label}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-semibold">฿</span>
                    <input
                      type="number"
                      min="0"
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-surface-container rounded-xl px-4 py-3 pl-8 font-body-md text-on-surface outline-none border border-outline-variant focus:border-primary placeholder:text-on-surface-variant/50"
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={handleSave}
                className="btn-primary w-full py-4"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                บันทึกเป้าหมาย
              </button>

              {goal && (
                <button
                  onClick={handleRemove}
                  className="w-full py-2.5 font-body-md text-error hover:bg-error-container rounded-xl transition-colors"
                >
                  ลบเป้าหมายเดือนนี้
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
