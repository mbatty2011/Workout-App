"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import type { Meal } from "@/lib/database.types";
import {
  MEAL_LABELS,
  sumLogs,
  type FoodLogWithFood,
} from "@/modules/food/constants";
import { FoodInput } from "@/modules/food/components/FoodInput";
import { DeleteLogButton } from "@/modules/food/components/DeleteLogButton";

/**
 * One meal as a container of ingredients. Shows the meal's running subtotal and
 * lets the user add ingredients (scan/search) scoped to this meal + day.
 */
export function MealCard({
  meal,
  dateStr,
  ingredients,
}: {
  meal: Meal;
  dateStr: string;
  ingredients: FoodLogWithFood[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const subtotal = sumLogs(ingredients);

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{MEAL_LABELS[meal]}</h2>
        {ingredients.length > 0 && (
          <span className="tabular text-xs text-muted">
            {Math.round(subtotal.calories)} kcal · {Math.round(subtotal.protein)}g P
          </span>
        )}
      </div>

      {ingredients.length > 0 && (
        <div className="space-y-1">
          {ingredients.map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm">{log.food?.name}</p>
                <p className="tabular text-xs text-muted">
                  {log.servings}× · {Math.round((log.food?.calories ?? 0) * log.servings)} kcal ·{" "}
                  {Math.round((log.food?.protein_g ?? 0) * log.servings)}g P
                </p>
              </div>
              <DeleteLogButton id={log.id} />
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="rounded-xl border border-border bg-surface p-2">
          <FoodInput
            meal={meal}
            dateStr={dateStr}
            onLogged={() => {
              setAdding(false);
              router.refresh();
            }}
          />
          <button onClick={() => setAdding(false)} className="mt-2 w-full py-1 text-center text-xs text-muted">
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-sm text-muted active:bg-bg"
        >
          <PlusIcon className="h-4 w-4" /> Add ingredient
        </button>
      )}
    </Card>
  );
}
