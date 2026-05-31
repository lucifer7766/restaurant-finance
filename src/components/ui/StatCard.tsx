import { cn, formatBaht, formatPercent } from "@/lib/utils";
import type { StatMetric } from "@/lib/data";

type StatCardProps = {
  metric: StatMetric;
  className?: string;
};

function formatValue(metric: StatMetric): string {
  switch (metric.format) {
    case "currency":
      return formatBaht(metric.value);
    case "percent":
      return `${metric.value.toFixed(1)}%`;
    case "number":
      return metric.value.toLocaleString("en-US");
  }
}

function getValueColor(label: string) {
  const lowerLabel = label.toLowerCase();

  if (
    lowerLabel.includes("expense") ||
    lowerLabel.includes("cost") ||
    lowerLabel.includes("รายจ่าย")
  ) {
    return "text-red-600 dark:text-red-400";
  }

  if (
    lowerLabel.includes("income") ||
    lowerLabel.includes("revenue") ||
    lowerLabel.includes("รายรับ")
  ) {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (
    lowerLabel.includes("profit") ||
    lowerLabel.includes("margin") ||
    lowerLabel.includes("กำไร")
  ) {
    return "text-blue-600 dark:text-blue-400";
  }

  return "text-zinc-900 dark:text-zinc-50";
}

export function StatCard({ metric, className }: StatCardProps) {
  const isPositive = metric.change >= 0;
  const valueColor = getValueColor(metric.label);

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
        className,
      )}
    >
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{metric.label}</p>

      <p className={cn("mt-2 text-3xl font-semibold tracking-tight", valueColor)}>
        {formatValue(metric)}
      </p>

      <p
        className={cn(
          "mt-2 text-sm font-medium",
          isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
        )}
      >
        {metric.change === 0 ? "No previous month data" : `${formatPercent(metric.change)} vs last month`}
      </p>
    </div>
  );
}