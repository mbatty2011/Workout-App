"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { SparkIcon } from "@/components/icons";

/**
 * On-demand AI weekly recap. Fetches only when tapped, and remembers the last
 * recap for the day in localStorage so repeat visits don't re-spend tokens.
 */
export function CoachCard() {
  const [recap, setRecap] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = JSON.parse(localStorage.getItem("coach-recap") ?? "null") as {
        day: string;
        text: string;
      } | null;
      return saved && saved.day === new Date().toDateString() ? saved.text : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getRecap() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/recap", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Coach is unavailable");
      setRecap(data.recap as string);
      try {
        localStorage.setItem(
          "coach-recap",
          JSON.stringify({ day: new Date().toDateString(), text: data.recap }),
        );
      } catch {
        // localStorage full/blocked — fine, just don't cache.
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-2 border-accent/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparkIcon className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold">Coach</h2>
        </div>
        {recap && (
          <button onClick={getRecap} disabled={loading} className="text-xs text-muted">
            {loading ? "Thinking…" : "Refresh"}
          </button>
        )}
      </div>

      {recap ? (
        <p className="text-sm leading-relaxed text-text/90">{recap}</p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Get a personal read on your week — training, food, and one focus.
          </p>
          <button
            onClick={getRecap}
            disabled={loading}
            className="shrink-0 rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-accent-text active:scale-95 disabled:opacity-50"
          >
            {loading ? "Thinking…" : "Weekly recap"}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  );
}
