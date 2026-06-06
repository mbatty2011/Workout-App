import { createClient } from "@/lib/supabase/server";
import { estimate1RM, setVolume } from "@/lib/utils";

export interface WeekSummary {
  workouts: number;
  sets: number;
  volume: number;
}

/** Workouts / sets / volume over the trailing 7 days (spec §5.5 weekly summary). */
export async function getWeekSummary(): Promise<WeekSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { workouts: 0, sets: 0, volume: 0 };

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id")
    .eq("owner_id", user.id)
    .not("ended_at", "is", null)
    .gte("started_at", since.toISOString());

  const ids = (workouts ?? []).map((w) => w.id);
  if (ids.length === 0) return { workouts: 0, sets: 0, volume: 0 };

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("reps, weight, is_warmup")
    .in("workout_id", ids)
    .eq("is_warmup", false);

  const volume = (sets ?? []).reduce((acc, s) => acc + setVolume(s.weight, s.reps), 0);
  return { workouts: ids.length, sets: sets?.length ?? 0, volume };
}

export interface ExerciseSummary {
  exercise_id: string;
  name: string;
  muscle_group: string;
  best_weight: number | null;
  best_e1rm: number | null;
}

/** Every exercise the user has logged, with their bests (for the progress list). */
export async function listLoggedExercises(): Promise<ExerciseSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("workout_sets")
    .select("exercise_id, reps, weight, is_warmup, exercises(name, muscle_group), workouts!inner(owner_id, ended_at)")
    .eq("workouts.owner_id", user.id)
    .not("workouts.ended_at", "is", null)
    .eq("is_warmup", false);

  const map = new Map<string, ExerciseSummary>();
  for (const s of data ?? []) {
    const ex = s.exercises as unknown as { name: string; muscle_group: string } | null;
    if (!ex) continue;
    const cur =
      map.get(s.exercise_id) ??
      ({
        exercise_id: s.exercise_id,
        name: ex.name,
        muscle_group: ex.muscle_group,
        best_weight: null,
        best_e1rm: null,
      } satisfies ExerciseSummary);
    if (s.weight != null && (cur.best_weight == null || s.weight > cur.best_weight)) {
      cur.best_weight = s.weight;
    }
    const e1rm = estimate1RM(s.weight, s.reps);
    if (e1rm != null && (cur.best_e1rm == null || e1rm > cur.best_e1rm)) {
      cur.best_e1rm = e1rm;
    }
    map.set(s.exercise_id, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export interface ExercisePoint {
  date: string;
  topSet: number;
  e1rm: number;
  volume: number;
}

/** Per-session series for one exercise: top set, est. 1RM, volume (spec §5.5). */
export async function getExerciseHistory(exerciseId: string): Promise<{
  name: string;
  points: ExercisePoint[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { name: "", points: [] };

  const { data } = await supabase
    .from("workout_sets")
    .select("reps, weight, is_warmup, exercises(name), workouts!inner(owner_id, ended_at, started_at)")
    .eq("exercise_id", exerciseId)
    .eq("workouts.owner_id", user.id)
    .not("workouts.ended_at", "is", null)
    .eq("is_warmup", false);

  const name =
    (data?.[0]?.exercises as unknown as { name: string } | null)?.name ?? "Exercise";

  // Group by session day.
  const byDay = new Map<string, ExercisePoint>();
  for (const s of data ?? []) {
    const startedAt = (s.workouts as unknown as { started_at: string }).started_at;
    const day = startedAt.slice(0, 10);
    const point =
      byDay.get(day) ?? { date: day, topSet: 0, e1rm: 0, volume: 0 };
    if (s.weight != null && s.weight > point.topSet) point.topSet = s.weight;
    const e1rm = estimate1RM(s.weight, s.reps) ?? 0;
    if (e1rm > point.e1rm) point.e1rm = e1rm;
    point.volume += setVolume(s.weight, s.reps);
    byDay.set(day, point);
  }
  const points = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
  return { name, points };
}
