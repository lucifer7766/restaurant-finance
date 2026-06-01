"use client";

import { useMemo } from "react";
import type { RevenuePoint } from "@/lib/data";
import { formatBaht, formatCompactNumber } from "@/lib/utils";

type RevenueChartProps = {
  data: RevenuePoint[];
};

const CHART_HEIGHT = 200;
const PAD = { top: 16, right: 12, bottom: 36, left: 52 };

function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return "";
  const d: string[] = [`M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = ((prev[0] + curr[0]) / 2).toFixed(2);
    d.push(`C ${cpx} ${prev[1].toFixed(2)}, ${cpx} ${curr[1].toFixed(2)}, ${curr[0].toFixed(2)} ${curr[1].toFixed(2)}`);
  }
  return d.join(" ");
}

export function RevenueChart({ data }: RevenueChartProps) {
  const { maxValue, yTicks, innerW, innerH, baseY } = useMemo(() => {
    const max = Math.max(...data.flatMap((d) => [d.revenue, d.expenses]), 0);
    const paddedMax = max === 0 ? 10000 : Math.ceil(max / 10000) * 10000;
    const ticks = Array.from({ length: 5 }, (_, i) => (paddedMax / 4) * i);
    const w = 100 - PAD.left - PAD.right;
    const h = CHART_HEIGHT - PAD.top - PAD.bottom;
    return { maxValue: paddedMax, yTicks: ticks, innerW: w, innerH: h, baseY: PAD.top + h };
  }, [data]);

  const getX = (i: number) =>
    PAD.left + (data.length <= 1 ? innerW / 2 : (innerW / (data.length - 1)) * i);

  const getY = (value: number) =>
    PAD.top + innerH - (value / maxValue) * innerH;

  const revPoints: [number, number][] = data.map((d, i) => [getX(i), getY(d.revenue)]);
  const expPoints: [number, number][] = data.map((d, i) => [getX(i), getY(d.expenses)]);

  const revPath = smoothPath(revPoints);
  const expPath = smoothPath(expPoints);

  const revAreaPath = revPath
    ? `${revPath} L ${revPoints[revPoints.length - 1][0].toFixed(2)} ${baseY.toFixed(2)} L ${PAD.left.toFixed(2)} ${baseY.toFixed(2)} Z`
    : "";

  return (
    <div className="w-full">
      <div style={{ height: `${CHART_HEIGHT + 8}px` }} className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 100 ${CHART_HEIGHT}`}
          className="h-full w-full"
          role="img"
          aria-label="รายรับและรายจ่าย 12 เดือน"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Horizontal grid lines */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={PAD.left} y1={y}
                  x2={100 - PAD.right} y2={y}
                  stroke="currentColor" strokeOpacity={0.07}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={PAD.left - 3} y={y + 0.8}
                  textAnchor="end" dominantBaseline="middle"
                  className="fill-zinc-400" style={{ fontSize: "3px" }}
                >
                  {formatCompactNumber(tick)}
                </text>
              </g>
            );
          })}

          {/* Area fill under revenue line */}
          {revAreaPath && (
            <path d={revAreaPath} fill="#115637" fillOpacity={0.06} />
          )}

          {/* Revenue line */}
          {revPath && (
            <path
              d={revPath} fill="none"
              stroke="#115637" strokeWidth="1.2"
              strokeLinecap="round" strokeLinejoin="round"
            />
          )}

          {/* Expense line */}
          {expPath && (
            <path
              d={expPath} fill="none"
              stroke="#ba1a1a" strokeWidth="1.2"
              strokeLinecap="round" strokeLinejoin="round"
            />
          )}

          {/* Data points + x-axis labels */}
          {data.map((point, i) => {
            const x = getX(i);
            return (
              <g key={point.month}>
                <circle cx={x} cy={getY(point.revenue)} r="0.9" fill="#115637">
                  <title>{`${point.month} รายรับ: ${formatBaht(point.revenue)}`}</title>
                </circle>
                <circle cx={x} cy={getY(point.expenses)} r="0.9" fill="#ba1a1a">
                  <title>{`${point.month} รายจ่าย: ${formatBaht(point.expenses)}`}</title>
                </circle>
                <text
                  x={x} y={baseY + 9}
                  textAnchor="middle"
                  className="fill-zinc-400" style={{ fontSize: "2.8px" }}
                >
                  {point.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

    </div>
  );
}
