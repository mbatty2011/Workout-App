import type { Food, FoodLog, Meal } from "@/lib/database.types";

/** Meal buckets, safe to import from client components. */
export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

/** A food log joined with its food row. */
export interface FoodLogWithFood extends FoodLog {
  food: Food | null;
}

export interface DayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Sum a set of logs into day/meal totals (pure — usable anywhere). */
export function sumLogs(logs: FoodLogWithFood[]): DayTotals {
  return logs.reduce<DayTotals>(
    (acc, log) => {
      const f = log.food;
      if (!f) return acc;
      const s = log.servings;
      acc.calories += (f.calories ?? 0) * s;
      acc.protein += (f.protein_g ?? 0) * s;
      acc.carbs += (f.carbs_g ?? 0) * s;
      acc.fat += (f.fat_g ?? 0) * s;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
