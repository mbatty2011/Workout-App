import { createClient } from "@/lib/supabase/server";
import type { Food, FoodLog, Meal } from "@/lib/database.types";

export interface FoodLogWithFood extends FoodLog {
  food: Food | null;
}

export interface DayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Today's food logs (local day), joined with their food rows. */
export async function getTodaysFoodLogs(): Promise<FoodLogWithFood[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("food_logs")
    .select("*, food:foods(*)")
    .eq("owner_id", user.id)
    .gte("logged_at", start.toISOString())
    .order("logged_at");
  return (data ?? []) as unknown as FoodLogWithFood[];
}

/** Calories + protein are primary; carbs/fat secondary (spec §5.8). */
export function computeTotals(logs: FoodLogWithFood[]): DayTotals {
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

export { MEALS } from "@/modules/food/constants";
