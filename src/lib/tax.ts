import type { RecentTransaction } from "@/lib/data";

export const DEFAULT_VAT_RATE = 7;

export type TaxBreakdown = {
  grossAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxRate: number;
};

/**
 * Transaction amounts in Slipless are always stored as the total paid/received.
 * This keeps existing profit and cash-flow reports correct while allowing VAT to
 * be reported separately.
 */
export function calculateIncludedTax(amount: number, taxRate = 0): TaxBreakdown {
  const grossAmount = Number(amount) || 0;
  const safeRate = Number.isFinite(taxRate) && taxRate > 0 ? taxRate : 0;
  const taxAmount = safeRate === 0 ? 0 : Number((grossAmount * safeRate / (100 + safeRate)).toFixed(2));

  return {
    grossAmount,
    taxableAmount: Number((grossAmount - taxAmount).toFixed(2)),
    taxAmount,
    taxRate: safeRate,
  };
}

export type MonthlyTaxSummary = {
  outputTax: number;
  inputTax: number;
  payableTax: number;
  taxableSales: number;
  taxablePurchases: number;
};

export function getMonthlyTaxSummary(
  transactions: RecentTransaction[],
  monthKey: string,
): MonthlyTaxSummary {
  let outputTax = 0;
  let inputTax = 0;
  let taxableSales = 0;
  let taxablePurchases = 0;

  for (const transaction of transactions) {
    if (!transaction.date.startsWith(monthKey)) continue;
    const tax = calculateIncludedTax(transaction.amount, transaction.taxRate ?? 0);
    const taxAmount = transaction.taxAmount ?? tax.taxAmount;
    const taxableAmount = Number((transaction.amount - taxAmount).toFixed(2));

    if (transaction.type === "income") {
      outputTax += taxAmount;
      taxableSales += taxableAmount;
    } else {
      inputTax += taxAmount;
      taxablePurchases += taxableAmount;
    }
  }

  return {
    outputTax: Number(outputTax.toFixed(2)),
    inputTax: Number(inputTax.toFixed(2)),
    payableTax: Number((outputTax - inputTax).toFixed(2)),
    taxableSales: Number(taxableSales.toFixed(2)),
    taxablePurchases: Number(taxablePurchases.toFixed(2)),
  };
}
