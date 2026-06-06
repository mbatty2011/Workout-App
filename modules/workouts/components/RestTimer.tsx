"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const PRESETS = [60, 90, 120, 180];

/**
 * Built-in rest timer (spec §5.3). Counts down, can be started from a preset or
 * auto-started after logging a set. Stays out of the way until needed.
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

  // Auto-start when a set is logged (autoStartKey changes).
  useEffect(() => {
    if (autoStartKey === undefined || autoStartKey === 0) return;
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

  const mm = String(Math.floor(remaining / 60)).padStart(1, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2">
      <div
        className={cn(
          "tabular w-16 text-center text-lg font-semibold",
          running ? "text-accent" : "text-muted",
        )}
      >
        {mm}:{ss}
      </div>
      <div className="flex flex-1 gap-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => start(p)}
            className="flex-1 rounded-lg border border-border py-1.5 text-xs text-muted active:scale-95"
          >
            {p < 120 ? `${p}s` : `${p / 60}m`}
          </button>
        ))}
      </div>
      {running && (
        <button
          onClick={() => setRunning(false)}
          className="rounded-lg px-2 py-1.5 text-xs text-danger"
        >
          Stop
        </button>
      )}
    </div>
  );
}
