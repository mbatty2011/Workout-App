"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import type { Food, Meal } from "@/lib/database.types";
import { MEALS } from "@/modules/food/constants";
import { logFood } from "@/modules/food/actions";

/**
 * Search foods (USDA + Open Food Facts via the adapter) and log servings to a
 * meal (spec §5.8). Logging updates today's totals on refresh.
 */
export function FoodSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults((data.foods ?? []) as Food[]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  if (selected) {
    return (
      <LogForm
        food={selected}
        onDone={() => {
          setSelected(null);
          setQuery("");
          setResults([]);
          router.refresh();
        }}
        onCancel={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search a food…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && <p className="px-1 text-sm text-muted">Searching…</p>}
      <div className="space-y-1">
        {results.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelected(f)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-left"
          >
            <div className="min-w-0">
              <p className="truncate text-sm">{f.name}</p>
              <p className="truncate text-xs text-muted">
                {f.brand ? `${f.brand} · ` : ""}
                {f.serving ?? ""}
              </p>
            </div>
            <span className="tabular shrink-0 text-sm text-muted">
              {f.calories != null ? Math.round(f.calories) : "–"} kcal
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LogForm({
  food,
  onDone,
  onCancel,
}: {
  food: Food;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [servings, setServings] = useState("1");
  const [meal, setMeal] = useState<Meal>("breakfast");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const s = Number(servings) || 0;

  return (
    <Card className="space-y-3">
      <div>
        <p className="font-medium">{food.name}</p>
        <p className="text-xs text-muted">
          per serving: {Math.round(food.calories ?? 0)} kcal ·{" "}
          {Math.round(food.protein_g ?? 0)}g protein
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          inputMode="decimal"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          className="w-24"
        />
        <span className="text-sm text-muted">
          servings = {Math.round((food.calories ?? 0) * s)} kcal,{" "}
          {Math.round((food.protein_g ?? 0) * s)}g protein
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {MEALS.map((m) => (
          <button
            key={m}
            onClick={() => setMeal(m)}
            className={
              "rounded-lg py-2 text-xs capitalize " +
              (meal === m ? "bg-accent/15 text-accent" : "border border-border text-muted")
            }
          >
            {m}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await logFood(food.id, meal, s);
              if (res.error) setError(res.error);
              else onDone();
            })
          }
        >
          Log it
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
