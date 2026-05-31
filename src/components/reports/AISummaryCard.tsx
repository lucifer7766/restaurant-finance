import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { AISummary } from "@/lib/aiSummary";

type AISummaryCardProps = {
  aiSummary: AISummary;
};

export function AISummaryCard({ aiSummary }: AISummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Summary</CardTitle>
        <p className="mt-1 text-xs text-zinc-400">
          สรุปอัตโนมัติจากข้อมูลเดือน{aiSummary.monthLabel} (rule-based)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">รายรับรวม</dt>
            <dd className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {aiSummary.totalIncome}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">รายจ่ายรวม</dt>
            <dd className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
              {aiSummary.totalExpenses}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">กำไรสุทธิ</dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {aiSummary.netProfit}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">อัตรากำไร</dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {aiSummary.profitMargin}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 sm:col-span-2 lg:col-span-2 dark:border-zinc-800 dark:bg-zinc-900">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">หมวดค่าใช้จ่ายสูงสุด</dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {aiSummary.biggestExpenseCategory}
            </dd>
          </div>
        </dl>

        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
            {aiSummary.summary}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {aiSummary.advice}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
