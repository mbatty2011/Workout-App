"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { MacroPlan as MacroPlanData, MacroTarget } from "@/modules/goals/queries";
import { setMacroPlan } from "@/modules/goals/actions";

const ROWS: { key: keyof Omit<MacroPlanData, "hasPlan">; label: string; suffix: string; tint: string }[] = [
  { key: "calories", label: "Calories", suffix: "kcal", tint: "bg-accent" },
  { key: "protein", label: "Protein", suffix: "g", tint: "bg-sky-400" },
  { key: "carbs", label: "Carbs", suffix: "g", tint: "bg-amber-400" },
  { key: "fat", label: "Fat", suffix: "g", tint: "bg-rose-400" },
];

/** The day's macro plan with progress, plus an inline editor. */
export function MacroPlan({ plan }: { plan: MacroPlanData }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <MacroPlanEditor plan={plan} onClose={() => setEditing(false)} />;
  }

  if (!plan.hasPlan) {
    return (
      <Card className="flex items-center justify-between">
        <div>
          <p className="font-medium">No macro plan yet</p>
          <p className="text-sm text-muted">Set daily targets to track your diet.</p>
        </div>
        <Button size="sm" onClick={() => setEditing(true)}>
          Set plan
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">Today&apos;s macro plan</h2>
        <button onClick={() => setEditing(true)} className="text-xs text-accent">
          Edit
        </button>
      </div>
      {ROWS.map(({ key, label, suffix, tint }) => {
        const m = plan[key] as MacroTarget | null;
        if (!m) return null;
        const pct = m.target > 0 ? Math.min((m.current / m.target) * 100, 100) : 0;
        const over = m.current > m.target;
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span>{label}</span>
              <span className="tabular text-muted">
                <span className={cn(over && "text-danger")}>{m.current}</span> / {m.target}
                {suffix}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg">
              <div
                className={cn("h-full rounded-full transition-all", over ? "bg-danger" : tint)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function MacroPlanEditor({
  plan,
  onClose,
}: {
  plan: MacroPlanData;
  onClose: () => void;
}) {
  const router = useRouter();
  const [calories, setCalories] = useState(plan.calories ? String(plan.calories.target) : "");
  const [protein, setProtein] = useState(plan.protein ? String(plan.protein.target) : "");
  const [carbs, setCarbs] = useState(plan.carbs ? String(plan.carbs.target) : "");
  const [fat, setFat] = useState(plan.fat ? String(plan.fat.target) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const fields: [string, string, (v: string) => void, string][] = [
    ["Calories", calories, setCalories, "kcal / day"],
    ["Protein", protein, setProtein, "g / day"],
    ["Carbs", carbs, setCarbs, "g / day"],
    ["Fat", fat, setFat, "g / day"],
  ];

  return (
    <Card className="space-y-3">
      <h2 className="font-medium">Daily macro plan</h2>
      <div className="grid grid-cols-2 gap-2">
        {fields.map(([label, value, set, ph]) => (
          <label key={label} className="block">
            <span className="mb-1 block text-xs text-muted">{label}</span>
            <input
              inputMode="numeric"
              value={value}
              placeholder={ph}
              onChange={(e) => set(e.target.value)}
              className="tabular h-11 w-full rounded-xl border border-border bg-bg px-3 outline-none focus:border-accent"
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">Leave a field blank to skip tracking it.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await setMacroPlan({
                calories: Number(calories) || undefined,
                protein: Number(protein) || undefined,
                carbs: Number(carbs) || undefined,
                fat: Number(fat) || undefined,
              });
              if (res.error) setError(res.error);
              else {
                onClose();
                router.refresh();
              }
            })
          }
        >
          Save plan
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
