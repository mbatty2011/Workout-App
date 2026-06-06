"use client";

import { useState, useTransition } from "react";
import { Button, Card, Input } from "@/components/ui";
import type { GoalType } from "@/lib/database.types";
import { setGoal } from "@/modules/goals/actions";

const TYPES: { type: GoalType; label: string; hint: string }[] = [
  { type: "weight", label: "Goal weight", hint: "target bodyweight" },
  { type: "calorie", label: "Daily calories", hint: "kcal / day" },
  { type: "protein", label: "Daily protein", hint: "g / day" },
  { type: "workouts_per_week", label: "Workouts / week", hint: "sessions / week" },
];

export function GoalEditor() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<GoalType>("protein");
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        + Set a goal
      </Button>
    );
  }

  return (
    <Card className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {TYPES.map((t) => (
          <button
            key={t.type}
            onClick={() => setType(t.type)}
            className={
              "rounded-xl border px-3 py-2 text-left text-sm " +
              (type === t.type
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted")
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <Input
        inputMode="decimal"
        placeholder={TYPES.find((t) => t.type === type)?.hint}
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await setGoal(type, Number(target));
              if (res.error) setError(res.error);
              else {
                setTarget("");
                setOpen(false);
              }
            })
          }
        >
          Save goal
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
