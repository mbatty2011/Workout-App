"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

function shift(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Prev/next day + a native date picker (the "calendar") for the food log. */
export function DayNav({ dateStr, today }: { dateStr: string; today: string }) {
  const router = useRouter();
  const isToday = dateStr === today;
  const yesterday = shift(today, -1);

  const label =
    dateStr === today
      ? "Today"
      : dateStr === yesterday
        ? "Yesterday"
        : new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          });

  function go(d: string) {
    router.push(d === today ? "/food" : `/food?date=${d}`);
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        onClick={() => go(shift(dateStr, -1))}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted active:bg-surface"
        aria-label="Previous day"
      >
        ‹
      </button>

      <label className="relative flex flex-1 items-center justify-center">
        <span className="text-sm font-medium">{label}</span>
        <input
          type="date"
          value={dateStr}
          max={today}
          onChange={(e) => e.target.value && go(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Pick a date"
        />
      </label>

      <button
        onClick={() => go(shift(dateStr, 1))}
        disabled={isToday}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-lg border border-border text-muted active:bg-surface",
          isToday && "opacity-30",
        )}
        aria-label="Next day"
      >
        ›
      </button>
    </div>
  );
}
