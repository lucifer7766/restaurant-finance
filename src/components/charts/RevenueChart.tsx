"use client";

import { useMemo } from "react";
import type { RevenuePoint } from "@/lib/data";
import { formatBaht, formatCompactNumber } from "@/lib/utils";

type RevenueChartProps = {
  data: RevenuePoint[];
};

/* ─── Coordinate constants ────────────────────────────────────────────────── */
const VW   = 600;   // viewBox width
const VH   = 240;   // viewBox height
const PAD  = { top: 20, right: 16, bottom: 44, left: 62 };
const INNER_W = VW - PAD.left - PAD.right;  // 522
const INNER_H = VH - PAD.top  - PAD.bottom; // 176
const BASE_Y  = PAD.top + INNER_H;          // 196

/* ─── Smooth cubic bezier path ────────────────────────────────────────────── */
function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return "";
  const d: string[] = [`M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = ((prev[0] + curr[0]) / 2).toFixed(1);
    d.push(
      `C ${cpx} ${prev[1].toFixed(1)}, ${cpx} ${curr[1].toFixed(1)}, ${curr[0].toFixed(1)} ${curr[1].toFixed(1)}`
    );
  }
  return d.join(" ");
}

/* ─── Component ───────────────────────────────────────────────────────────── */
export function RevenueChart({ data }: RevenueChartProps) {
  const { maxValue, yTicks } = useMemo(() => {
    const max = Math.max(...data.flatMap((d) => [d.revenue, d.expenses]), 0);
    const paddedMax = max === 0 ? 10000 : Math.ceil(max / 10000) * 10000;
    const ticks = Array.from({ length: 5 }, (_, i) => (paddedMax / 4) * i);
    return { maxValue: paddedMax, yTicks: ticks };
  }, [data]);

  const getX = (i: number) =>
    PAD.left + (data.length <= 1 ? INNER_W / 2 : (INNER_W / (data.length - 1)) * i);

  const getY = (value: number) =>
    PAD.top + INNER_H - (value / maxValue) * INNER_H;

  const revPoints: [number, number][] = data.map((d, i) => [getX(i), getY(d.revenue)]);
  const expPoints: [number, number][] = data.map((d, i) => [getX(i), getY(d.expenses)]);

  const revPath = smoothPath(revPoints);
  const expPath = smoothPath(expPoints);

  const revAreaPath = revPath && revPoints.length > 0
    ? `${revPath} L ${revPoints.at(-1)![0].toFixed(1)} ${BASE_Y} L ${PAD.left} ${BASE_Y} Z`
    : "";

  return (
    /*
     * width="100%" + no explicit height → SVG scales to full container width
     * and height = width × (VH / VW) automatically. No distortion.
     */
    <div className="w-full">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        role="img"
        aria-label="รายรับและรายจ่ายรายสัปดาห์"
      >
        {/* ── Horizontal grid lines ──────────────────────────── */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={PAD.left} y1={y}
                x2={VW - PAD.right} y2={y}
                stroke="currentColor" strokeOpacity={0.08}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PAD.left - 8} y={y}
                textAnchor="end" dominantBaseline="middle"
                fill="#9ca3af" fontSize={14}
              >
                {formatCompactNumber(tick)}
              </text>
            </g>
          );
        })}

        {/* ── Area fill under revenue line ───────────────────── */}
        {revAreaPath && (
          <path d={revAreaPath} fill="#115637" fillOpacity={0.07} />
        )}

        {/* ── Revenue line ───────────────────────────────────── */}
        {revPath && (
          <path
            d={revPath} fill="none"
            stroke="#115637" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}

        {/* ── Expense line ───────────────────────────────────── */}
        {expPath && (
          <path
            d={expPath} fill="none"
            stroke="#ba1a1a" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}

        {/* ── Data points + x-axis labels ────────────────────── */}
        {data.map((point, i) => {
          const x = getX(i);
          return (
            <g key={`${point.month}-${i}`}>
              {/* Revenue dot */}
              <circle cx={x} cy={getY(point.revenue)} r={5} fill="#115637">
                <title>{`${point.month} รายรับ: ${formatBaht(point.revenue)}`}</title>
              </circle>
              {/* Expense dot */}
              <circle cx={x} cy={getY(point.expenses)} r={5} fill="#ba1a1a">
                <title>{`${point.month} รายจ่าย: ${formatBaht(point.expenses)}`}</title>
              </circle>
              {/* X-axis label */}
              <text
                x={x} y={BASE_Y + 22}
                textAnchor="middle"
                fill="#9ca3af" fontSize={13}
              >
                {point.month}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
