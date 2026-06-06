import { createClient } from "@/lib/supabase/server";
import type { Goal, WeightLog } from "@/lib/database.types";
import { getWeekSummary } from "@/modules/progress/queries";
import { getTodaysFoodLogs, computeTotals } from "@/modules/food/queries";

export interface GoalProgress {
  goal: Goal;
  current: number;
  target: number;
  /** 0..1 for display; for weight goals this is relative to the start. */
  ratio: number;
  unitLabel: string;
}

export async function listGoals(): Promise<Goal[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("goals")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at");
  return data ?? [];
}

export async function getWeightLogs(limit = 60): Promise<WeightLog[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("owner_id", user.id)
    .order("logged_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}

/** Live progress for each goal from logged data (spec §5.9). */
export async function getGoalsWithProgress(): Promise<GoalProgress[]> {
  const goals = await listGoals();
  if (goals.length === 0) return [];

  // Gather the inputs each goal type needs, lazily but at most once.
  const needsFood = goals.some((g) => g.type === "calorie" || g.type === "protein");
  const needsWeek = goals.some((g) => g.type === "workouts_per_week");
  const needsWeight = goals.some((g) => g.type === "weight");

  const totals = needsFood ? computeTotals(await getTodaysFoodLogs()) : null;
  const week = needsWeek ? await getWeekSummary() : null;
  const weights = needsWeight ? await getWeightLogs() : [];
  const latestWeight = weights.at(-1)?.weight ?? null;

  return goals.map((goal) => {
    let current = 0;
    let unitLabel = "";
    switch (goal.type) {
      case "calorie":
        current = Math.round(totals?.calories ?? 0);
        unitLabel = "kcal today";
        break;
      case "protein":
        current = Math.round(totals?.protein ?? 0);
        unitLabel = "g protein today";
        break;
      case "workouts_per_week":
        current = week?.workouts ?? 0;
        unitLabel = "this week";
        break;
      case "weight":
        current = latestWeight ?? 0;
        unitLabel = "current";
        break;
    }
    const ratio = goal.target > 0 ? Math.min(current / goal.target, 1) : 0;
    return { goal, current, target: goal.target, ratio, unitLabel };
  });
}
