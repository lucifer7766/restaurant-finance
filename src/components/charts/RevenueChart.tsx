"use client";

import { useMemo } from "react";
import type { RevenuePoint } from "@/lib/data";
import { formatBaht, formatCompactNumber } from "@/lib/utils";

type RevenueChartProps = {
  data: RevenuePoint[];
};

const CHART_HEIGHT = 220;
const CHART_PADDING = { top: 20, right: 10, bottom: 34, left: 50 };

export function RevenueChart({ data }: RevenueChartProps) {
  const { bars, maxValue, yTicks } = useMemo(() => {
    const max = Math.max(...data.flatMap((d) => [d.revenue, d.expenses]), 0);
    const paddedMax = max === 0 ? 1000 : Math.ceil(max / 10000) * 10000;
    const ticks = Array.from({ length: 5 }, (_, i) => (paddedMax / 4) * i);

    return { bars: data, maxValue: paddedMax, yTicks: ticks };
  }, [data]);

  const innerWidth = 100 - CHART_PADDING.left - CHART_PADDING.right;
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const groupWidth = innerWidth / Math.max(data.length, 1);
  const barWidth = Math.min(groupWidth * 0.28, 2.8);
  const gap = Math.min(groupWidth * 0.12, 1.2);
  const baseY = CHART_PADDING.top + innerHeight;

  return (
    <div className="w-full">
      <div className="h-[280px] w-full overflow-hidden">
        <svg
          viewBox={`0 0 100 ${CHART_HEIGHT}`}
          className="h-full w-full"
          role="img"
          aria-label="Monthly revenue and expenses chart"
          preserveAspectRatio="xMidYMid meet"
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

          {bars.map((point, index) => {
            const groupX = CHART_PADDING.left + index * groupWidth + groupWidth / 2;
            const revenueHeight = Math.max(
              (point.revenue / maxValue) * innerHeight,
              point.revenue > 0 ? 2 : 0
            );
            const expenseHeight = Math.max(
              (point.expenses / maxValue) * innerHeight,
              point.expenses > 0 ? 2 : 0
            );

            return (
              <g key={point.month}>
                <rect
                  x={groupX - barWidth - gap / 2}
                  y={baseY - revenueHeight}
                  width={barWidth}
                  height={revenueHeight}
                  rx={0.7}
                  className="fill-emerald-500"
                >
                  <title>{`${point.month} revenue: ${formatBaht(point.revenue)}`}</title>
                </rect>

                <rect
                  x={groupX + gap / 2}
                  y={baseY - expenseHeight}
                  width={barWidth}
                  height={expenseHeight}
                  rx={0.7}
                  className="fill-red-400"
                >
                  <title>{`${point.month} expenses: ${formatBaht(point.expenses)}`}</title>
                </rect>

                <text
                  x={groupX}
                  y={baseY + 10}
                  textAnchor="middle"
                  className="fill-zinc-500 text-[2.6px] font-medium"
                >
                  {point.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-emerald-500" />
          <span className="text-zinc-600 dark:text-zinc-400">Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-red-400" />
          <span className="text-zinc-600 dark:text-zinc-400">Expenses</span>
        </div>
      </div>
    </div>
  );
}