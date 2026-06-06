"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/lib/database.types";
import { shareDayNutrition } from "@/modules/food/actions";

const VIS: { value: Visibility; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "followers", label: "Followers" },
  { value: "private", label: "Only me" },
];

/** Post the day's meals + macros to the social feed. */
export function ShareMeals({ dateStr }: { dateStr: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("followers");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <Card className="flex items-center justify-between">
        <span className="text-sm text-success">Shared to your feed ✓</span>
        <button onClick={() => router.push("/feed")} className="text-sm text-accent">
          View
        </button>
      </Card>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        Share this day to feed
      </Button>
    );
  }

  return (
    <Card className="space-y-3">
      <p className="text-sm text-muted">
        Posts the day&apos;s meals and macro totals to your feed.
      </p>
      <div className="grid grid-cols-3 gap-1">
        {VIS.map((v) => (
          <button
            key={v.value}
            onClick={() => setVisibility(v.value)}
            className={cn(
              "rounded-lg py-2 text-xs",
              visibility === v.value ? "bg-accent/15 text-accent" : "border border-border text-muted",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await shareDayNutrition(dateStr, visibility);
              if (res.error) setError(res.error);
              else setDone(true);
            })
          }
        >
          {pending ? "Posting…" : "Post"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
