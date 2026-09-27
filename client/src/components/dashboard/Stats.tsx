import type { ReactNode } from "react";
import { Card } from "../ui/Card";

// Dashboard primitives. Deliberately not charts where a chart would be wrong:
// headline counts are stat tiles, a ratio-against-a-total is a meter, and a
// magnitude comparison is a single-hue bar list with direct labels. Everything
// data-bearing uses ONE sequential hue (blue) — no categorical palette, so
// identity never rests on color alone.

export const StatTile = ({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  // Reserved status tones, always alongside the text label — never color alone.
  tone?: "neutral" | "warning" | "critical";
}) => {
  const valueClass =
    tone === "critical" ? "text-red-700" : tone === "warning" ? "text-amber-700" : "text-gray-900";

  return (
    <Card>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {/* Proportional figures: tabular-nums would look loose at this size. */}
      <p className={`mt-1 text-3xl font-semibold ${valueClass}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </Card>
  );
};

export const StatRow = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{children}</div>
);

// A single ratio against its total. Track is a lighter step of the fill's own
// ramp so the state reads across the whole bar; ends are rounded.
export const Meter = ({
  label,
  percentage,
  caption,
}: {
  label: string;
  percentage: number;
  caption?: string;
}) => (
  <div>
    <div className="mb-1 flex items-baseline justify-between gap-3">
      <span className="text-sm text-gray-700">{label}</span>
      <span className="text-sm font-medium text-gray-900">{percentage}%</span>
    </div>
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-blue-100"
      role="progressbar"
      aria-label={label}
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-blue-600 transition-[width]"
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
    {caption && <p className="mt-1 text-xs text-gray-400">{caption}</p>}
  </div>
);

// Magnitude comparison across a handful of named classes. One hue, direct
// labels on every row, bars scaled to the largest value rather than the total.
export const BarList = ({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) => {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-gray-500">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center gap-2 text-sm">
              <span className="w-28 shrink-0 truncate text-gray-600">{row.label}</span>
              <span className="flex-1">
                <span
                  className="block h-2 rounded-full bg-blue-600"
                  style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
                  title={`${row.label}: ${row.value}`}
                />
              </span>
              <span className="w-8 shrink-0 text-right font-medium tabular-nums text-gray-900">
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Change over time, single series — the title names it, so no legend. Values
// appear on hover rather than on every column.
export const MiniColumns = ({
  title,
  points,
}: {
  title: string;
  points: { label: string; value: number }[];
}) => {
  const max = Math.max(1, ...points.map((point) => point.value));

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-gray-500">{title}</p>
      {points.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing completed yet.</p>
      ) : (
        <div className="flex h-28 items-end gap-2">
          {points.map((point) => (
            <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-blue-600"
                style={{ height: `${Math.max(4, (point.value / max) * 100)}%` }}
                title={`${point.label}: ${point.value}`}
              />
              <span className="w-full truncate text-center text-[10px] text-gray-400">
                {point.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
