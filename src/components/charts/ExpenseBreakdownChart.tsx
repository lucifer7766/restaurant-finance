"use client";

import { useMemo } from "react";
import { formatBaht, formatCompactNumber, getCategoryLabel } from "@/lib/utils";

type BreakdownItem = {
  category: string;
  amount: number;
};

type ExpenseBreakdownChartProps = {
  data: BreakdownItem[];
};

const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 16, right: 8, bottom: 32, left: 48 };
const BAR_COLORS = ["bg-orange-500", "bg-orange-400", "bg-amber-500", "bg-amber-400"];
const BAR_FILL_CLASSES = [
  "fill-orange-500",
  "fill-orange-400",
  "fill-amber-500",
  "fill-amber-400",
];

export function ExpenseBreakdownChart({ data }: ExpenseBreakdownChartProps) {
  const { maxValue, yTicks } = useMemo(() => {
    const max = Math.max(...data.map((item) => item.amount), 1);
    const paddedMax = Math.ceil(max / 500) * 500;
    const ticks = Array.from({ length: 5 }, (_, index) => (paddedMax / 4) * index);

    return { maxValue: paddedMax, yTicks: ticks };
  }, [data]);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No expenses to chart for this month.
      </p>
    );
  }

  const innerWidth = 100 - CHART_PADDING.left - CHART_PADDING.right;
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const barWidth = innerWidth / data.length - 2;
  const baseY = CHART_PADDING.top + innerHeight;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 100 ${CHART_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Expense breakdown by category chart"
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
                x={CHART_PADDING.left - 2}
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

        {data.map((item, index) => {
          const barHeight = (item.amount / maxValue) * innerHeight;
          const x = CHART_PADDING.left + index * (innerWidth / data.length) + 1;
          const label = getCategoryLabel(item.category);

          return (
            <g key={item.category}>
              <rect
                x={x}
                y={baseY - barHeight}
                width={barWidth}
                height={barHeight}
                rx={0.8}
                className={BAR_FILL_CLASSES[index % BAR_FILL_CLASSES.length]}
              >
                <title>{`${label}: ${formatBaht(item.amount)}`}</title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={baseY + 10}
                textAnchor="middle"
                className="fill-zinc-500 text-[3px] font-medium"
              >
                {label.length > 8 ? `${label.slice(0, 8)}…` : label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
        {data.map((item, index) => (
          <div key={item.category} className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-sm ${BAR_COLORS[index % BAR_COLORS.length]}`}
            />
            <span className="text-zinc-600 dark:text-zinc-400">
              {getCategoryLabel(item.category)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
