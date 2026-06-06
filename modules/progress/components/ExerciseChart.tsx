"use client";

import { useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BRAND } from "@/config/brand";
import type { ExercisePoint } from "@/modules/progress/queries";

type Metric = "topSet" | "e1rm" | "volume";
const LABELS: Record<Metric, string> = {
  topSet: "Top set",
  e1rm: "Est. 1RM",
  volume: "Volume",
};

export function ExerciseChart({ points }: { points: ExercisePoint[] }) {
  const [metric, setMetric] = useState<Metric>("topSet");

  if (points.length === 0) {
    return <p className="text-sm text-muted">No history yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {(Object.keys(LABELS) as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={
              "rounded-lg px-3 py-1.5 text-xs " +
              (metric === m
                ? "bg-accent/15 text-accent"
                : "border border-border text-muted")
            }
          >
            {LABELS[m]}
          </button>
        ))}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <XAxis
              dataKey="date"
              tick={{ fill: BRAND.colors.muted, fontSize: 10 }}
              tickFormatter={(d: string) => d.slice(5)}
            />
            <YAxis tick={{ fill: BRAND.colors.muted, fontSize: 10 }} width={40} />
            <Tooltip
              contentStyle={{
                background: BRAND.colors.surface,
                border: `1px solid ${BRAND.colors.border}`,
                borderRadius: 12,
                color: BRAND.colors.text,
              }}
            />
            <Line
              type="monotone"
              dataKey={metric}
              stroke={BRAND.colors.accent}
              strokeWidth={2}
              dot={{ r: 3, fill: BRAND.colors.accent }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
