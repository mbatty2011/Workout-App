import { createClient } from "@/lib/supabase/server";
import {
  MEALS,
  sumLogs,
  type DayTotals,
  type FoodLogWithFood,
} from "@/modules/food/constants";

export type { FoodLogWithFood, DayTotals } from "@/modules/food/constants";
export { MEALS } from "@/modules/food/constants";

/** Logs for a specific local day (YYYY-MM-DD), joined with their food rows. */
export async function getFoodLogsForDay(dateStr: string): Promise<FoodLogWithFood[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data } = await supabase
    .from("food_logs")
    .select("*, food:foods(*)")
    .eq("owner_id", user.id)
    .gte("logged_at", start.toISOString())
    .lt("logged_at", end.toISOString())
    .order("logged_at");
  return (data ?? []) as unknown as FoodLogWithFood[];
}

/** Today's food logs (local day). */
export async function getTodaysFoodLogs(): Promise<FoodLogWithFood[]> {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return getFoodLogsForDay(dateStr);
}

/** Calories + protein primary; carbs/fat secondary (spec §5.8). */
export const computeTotals = sumLogs;

/** Distinct days the user has logged food, most recent first (for the calendar). */
export async function getLoggedDays(limit = 60): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("food_logs")
    .select("logged_at")
    .eq("owner_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(400);
  const days = new Set<string>();
  for (const row of data ?? []) days.add(row.logged_at.slice(0, 10));
  return Array.from(days).slice(0, limit);
}
