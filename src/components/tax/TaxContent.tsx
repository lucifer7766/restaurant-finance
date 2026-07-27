"use client";

import { useMemo } from "react";
import { useMonthFilter } from "@/context/MonthFilterContext";
import { useTransactions } from "@/components/transactions/TransactionsContent";
import { getMonthlyTaxSummary } from "@/lib/tax";
import { formatMonthLabel } from "@/lib/utils";

function money(value: number) {
  return `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function TaxContent() {
  const { transactions, isLoading, error } = useTransactions();
  const { selectedMonth } = useMonthFilter();
  const summary = useMemo(
    () => getMonthlyTaxSummary(transactions, selectedMonth),
    [transactions, selectedMonth],
  );

  if (isLoading) {
    return <div className="metric-card rounded-2xl p-7 animate-pulse h-64" />;
  }

  const payable = summary.payableTax >= 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      <div className="page-header-card rounded-2xl p-5 flex gap-4 items-center" style={{ borderLeftColor: "#115637" }}>
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-on-primary">
          <span className="material-symbols-outlined">receipt_long</span>
        </div>
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile text-on-surface">สรุปภาษีมูลค่าเพิ่ม</h2>
          <p className="font-body-md text-on-surface-variant">ภาษี VAT 7% ประจำ{formatMonthLabel(selectedMonth)}</p>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-error-container text-on-error-container">{error}</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="metric-card rounded-2xl p-5">
          <p className="font-label-caps text-label-caps text-on-surface-variant">ภาษีขาย</p>
          <p className="mt-2 text-3xl font-bold text-primary">{money(summary.outputTax)}</p>
          <p className="mt-2 font-body-sm text-on-surface-variant">จากยอดขายก่อน VAT {money(summary.taxableSales)}</p>
        </div>
        <div className="metric-card rounded-2xl p-5">
          <p className="font-label-caps text-label-caps text-on-surface-variant">ภาษีซื้อ</p>
          <p className="mt-2 text-3xl font-bold text-primary">{money(summary.inputTax)}</p>
          <p className="mt-2 font-body-sm text-on-surface-variant">จากยอดซื้อก่อน VAT {money(summary.taxablePurchases)}</p>
        </div>
      </div>

      <div className={`rounded-2xl p-6 ${payable ? "bg-primary text-on-primary" : "bg-primary-container text-on-primary-container"}`}>
        <p className="font-label-caps text-label-caps opacity-80">{payable ? "VAT ที่ต้องชำระ" : "VAT เครดิตคงเหลือ"}</p>
        <p className="mt-2 text-4xl font-bold">{money(Math.abs(summary.payableTax))}</p>
        <p className="mt-3 font-body-sm opacity-85">คำนวณจากภาษีขาย − ภาษีซื้อของรายการที่ระบุ VAT เท่านั้น</p>
      </div>

      <div className="sand-card rounded-2xl p-5">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-tertiary">info</span>
          <p className="font-body-md text-on-surface-variant">รายการเก่าที่ไม่มีการระบุ VAT จะนับเป็นอัตรา 0% เพื่อไม่เปลี่ยนยอดเดิม คุณสามารถระบุ VAT ได้เมื่อเพิ่มรายการใหม่</p>
        </div>
      </div>
    </div>
  );
}
