"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BRAND } from "@/config/brand";
import type { WeightLog } from "@/lib/database.types";

export function WeightChart({ logs }: { logs: WeightLog[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted">Log your bodyweight to see the trend.</p>;
  }
  const data = logs.map((l) => ({
    date: l.logged_at.slice(0, 10),
    weight: l.weight,
  }));
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND.colors.accent} stopOpacity={0.4} />
              <stop offset="100%" stopColor={BRAND.colors.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: BRAND.colors.muted, fontSize: 10 }}
            tickFormatter={(d: string) => d.slice(5)}
          />
          <YAxis
            domain={["dataMin - 2", "dataMax + 2"]}
            tick={{ fill: BRAND.colors.muted, fontSize: 10 }}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: BRAND.colors.surface,
              border: `1px solid ${BRAND.colors.border}`,
              borderRadius: 12,
              color: BRAND.colors.text,
            }}
          />
          <Area
            type="monotone"
            dataKey="weight"
            stroke={BRAND.colors.accent}
            strokeWidth={2}
            fill="url(#wg)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
