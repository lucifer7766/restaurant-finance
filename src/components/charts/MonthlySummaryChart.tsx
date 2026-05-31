"use client";

import { useMemo } from "react";
import { formatBaht, formatCompactNumber } from "@/lib/utils";

type MonthlySummaryChartProps = {
  income: number;
  expenses: number;
};

const CHART_HEIGHT = 220;
const CHART_PADDING = { top: 20, right: 12, bottom: 36, left: 52 };

export function MonthlySummaryChart({ income, expenses }: MonthlySummaryChartProps) {
  const { maxValue, yTicks } = useMemo(() => {
    const max = Math.max(income, expenses, 1);
    const paddedMax = Math.ceil(max / 10000) * 10000 || 10000;
    const ticks = Array.from({ length: 5 }, (_, index) => (paddedMax / 4) * index);

    return { maxValue: paddedMax, yTicks: ticks };
  }, [income, expenses]);

  const innerWidth = 100 - CHART_PADDING.left - CHART_PADDING.right;
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const barWidth = 12;
  const centerX = CHART_PADDING.left + innerWidth / 2;
  const baseY = CHART_PADDING.top + innerHeight;

  const incomeHeight = Math.max((income / maxValue) * innerHeight, income > 0 ? 3 : 0);
  const expenseHeight = Math.max((expenses / maxValue) * innerHeight, expenses > 0 ? 3 : 0);

  return (
    <div className="w-full">
      <div className="h-[280px] w-full overflow-hidden">
        <svg
          viewBox={`0 0 100 ${CHART_HEIGHT}`}
          className="h-full w-full"
          role="img"
          aria-label="Monthly income and expenses summary chart"
        >
          {yTicks.map((tick) => {
            const y = CHART_PADDING.top + innerHeight - (tick / maxValue) * innerHeight;

            return (
              <g key={tick}>
                <line
                  x1={CHART_PADDING.left}
                  y1={y}
                  x2={100 - CHART_PADDING.right}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={0.08}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={CHART_PADDING.left - 3}
                  y={y + 1}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-zinc-400 text-[3px] font-medium"
                >
                  {formatCompactNumber(tick)}
                </text>
              </g>
            );
          })}

          <rect
            x={centerX - barWidth - 4}
            y={baseY - incomeHeight}
            width={barWidth}
            height={incomeHeight}
            rx={1.4}
            className="fill-emerald-500"
          >
            <title>{`Income: ${formatBaht(income)}`}</title>
          </rect>

          <text
            x={centerX - barWidth / 2 - 4}
            y={baseY + 10}
            textAnchor="middle"
            className="fill-zinc-500 text-[3px] font-medium"
          >
            Income
          </text>

          <rect
            x={centerX + 4}
            y={baseY - expenseHeight}
            width={barWidth}
            height={expenseHeight}
            rx={1.4}
            className="fill-red-400"
          >
            <title>{`Expenses: ${formatBaht(expenses)}`}</title>
          </rect>

          <text
            x={centerX + barWidth / 2 + 4}
            y={baseY + 10}
            textAnchor="middle"
            className="fill-zinc-500 text-[3px] font-medium"
          >
            Expenses
          </text>
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-emerald-500" />
          <span className="text-zinc-600 dark:text-zinc-400">Income</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-red-400" />
          <span className="text-zinc-600 dark:text-zinc-400">Expenses</span>
        </div>
      </div>
    </div>
  );
}