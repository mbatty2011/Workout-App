"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TimerIcon } from "@/components/icons";

const PRESETS = [60, 90, 120, 180];

/**
 * Built-in rest timer. Auto-starts when a set is completed (autoStartKey
 * changes) and can be started from a preset. Stays quiet until needed.
 */
export function RestTimer({ autoStartKey }: { autoStartKey?: number }) {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const defaultRest = useRef(90);

  function start(seconds: number) {
    defaultRest.current = seconds;
    setRemaining(seconds);
    setRunning(true);
  }

  useEffect(() => {
    if (!autoStartKey) return;
    start(defaultRest.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartKey]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2 py-1.5">
      <div
        className={cn(
          "flex w-[4.5rem] items-center gap-1.5 pl-1",
          running ? "text-accent" : "text-muted",
        )}
      >
        <TimerIcon className="h-4 w-4" />
        <span className="tabular text-sm font-semibold">{mm}:{ss}</span>
      </div>
      <div className="flex flex-1 gap-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => start(p)}
            className="flex-1 rounded-lg border border-border py-1.5 text-xs text-muted active:bg-bg"
          >
            {p < 120 ? `${p}s` : `${p / 60}m`}
          </button>
        ))}
      </div>
      {running && (
        <button onClick={() => setRunning(false)} className="px-2 text-xs text-danger">
          Stop
        </button>
      )}
    </div>
  );
}
