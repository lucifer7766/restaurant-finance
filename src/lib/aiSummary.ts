import type { MonthlyReport } from "@/lib/data";
import { formatBaht, getCategoryLabel } from "@/lib/utils";

export type AISummary = {
  monthLabel: string;
  totalIncome: string;
  totalExpenses: string;
  netProfit: string;
  profitMargin: string;
  biggestExpenseCategory: string;
  summary: string;
  advice: string;
};

function getProfitComment(report: MonthlyReport): string {
  if (report.netProfit > 0 && report.profitMargin >= 30) {
    return "เดือนนี้ร้านมีกำไรดี";
  }

  if (report.netProfit > 0) {
    return "เดือนนี้ร้านมีกำไร แต่อัตรากำไรยังไม่สูงมาก";
  }

  if (report.netProfit < 0) {
    return "เดือนนี้ร้านขาดทุน";
  }

  return "เดือนนี้ร้านไม่กำไรไม่ขาดทุน";
}

function getExpenseComment(
  biggestCategory: string | undefined,
  biggestShare: number,
): string {
  if (!biggestCategory) {
    return "";
  }

  if (biggestCategory === "COGS" && biggestShare >= 30) {
    return "แต่ค่าใช้จ่ายด้านวัตถุดิบสูง ควรตรวจสอบต้นทุนอาหาร";
  }

  if (biggestCategory === "Operations" && biggestShare >= 30) {
    return "แต่ค่าใช้จ่ายดำเนินงานสูง ควรตรวจสอบค่าใช้จ่ายประจำของร้าน";
  }

  if (biggestShare >= 50) {
    const label = getCategoryLabel(biggestCategory);
    return `แต่ค่าใช้จ่ายด้าน${label}คิดสัดส่วนสูง ควรติดตามอย่างใกล้ชิด`;
  }

  return "";
}

function getBusinessAdvice(report: MonthlyReport, biggestCategory: string | undefined): string {
  if (report.totalIncome === 0 && report.totalExpenses === 0) {
    return "เริ่มบันทึกรายรับและรายจ่ายทุกวัน เพื่อให้วิเคราะห์ผลประกอบการได้แม่นยำขึ้น";
  }

  if (report.netProfit < 0) {
    return "แนะนำให้เพิ่มรายได้จากเมนูขายดี และลดค่าใช้จ่ายที่ไม่จำเป็น";
  }

  if (biggestCategory === "COGS") {
    return "ลองเจรจากับซัพพลายเออร์ หรือปรับเมนูให้ใช้วัตถุดิบคุ้มค่ามากขึ้น";
  }

  if (report.profitMargin >= 30) {
    return "รักษาระดับต้นทุนให้คงที่ และพยายามเพิ่มยอดขายต่อบิล";
  }

  return "ควรติดตามค่าใช้จ่ายรายสัปดาห์ และเปรียบเทียบกับยอดขายอย่างสม่ำเสมอ";
}

export function generateAISummary(
  report: MonthlyReport,
  monthLabel: string,
): AISummary {
  const biggestExpense = report.expenseBreakdown[0];
  const biggestShare =
    biggestExpense && report.totalExpenses > 0
      ? (biggestExpense.amount / report.totalExpenses) * 100
      : 0;

  if (report.totalIncome === 0 && report.totalExpenses === 0) {
    return {
      monthLabel,
      totalIncome: formatBaht(0),
      totalExpenses: formatBaht(0),
      netProfit: formatBaht(0),
      profitMargin: "0.0%",
      biggestExpenseCategory: "ไม่มีข้อมูล",
      summary: `เดือน${monthLabel} ยังไม่มีข้อมูลธุรกรรม ควรบันทึกรายรับรายจ่ายให้ครบเพื่อวิเคราะห์ผลประกอบการ`,
      advice: getBusinessAdvice(report, undefined),
    };
  }

  const profitComment = getProfitComment(report);
  const expenseComment = getExpenseComment(biggestExpense?.category, biggestShare);
  const summary = [profitComment, expenseComment].filter(Boolean).join(" ");

  return {
    monthLabel,
    totalIncome: formatBaht(report.totalIncome),
    totalExpenses: formatBaht(report.totalExpenses),
    netProfit: formatBaht(report.netProfit),
    profitMargin: `${report.profitMargin.toFixed(1)}%`,
    biggestExpenseCategory: biggestExpense
      ? getCategoryLabel(biggestExpense.category)
      : "ไม่มีข้อมูล",
    summary,
    advice: getBusinessAdvice(report, biggestExpense?.category),
  };
}
