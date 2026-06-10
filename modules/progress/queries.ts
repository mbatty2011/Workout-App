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

export interface TrainingStats {
  /** Consecutive calendar weeks (incl. this one) with ≥1 completed workout. */
  weekStreak: number;
  workoutsThisWeek: number;
  totalWorkouts: number;
}

/** Streak + counts for the home dashboard. */
export async function getTrainingStats(): Promise<TrainingStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { weekStreak: 0, workoutsThisWeek: 0, totalWorkouts: 0 };

  const { data, count } = await supabase
    .from("workouts")
    .select("started_at", { count: "exact" })
    .eq("owner_id", user.id)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(300);

  const dates = (data ?? []).map((w) => new Date(w.started_at));

  // Monday-anchored week key.
  const weekKey = (d: Date) => {
    const x = new Date(d);
    const day = (x.getDay() + 6) % 7; // Mon=0
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };

  const weeks = new Set(dates.map(weekKey));
  const thisWeek = weekKey(new Date());
  const MS_WEEK = 7 * 24 * 3600 * 1000;

  let weekStreak = 0;
  // Streak may start this week or (grace) last week if this week is still young.
  let cursor = weeks.has(thisWeek) ? thisWeek : thisWeek - MS_WEEK;
  while (weeks.has(cursor)) {
    weekStreak++;
    cursor -= MS_WEEK;
  }

  const workoutsThisWeek = dates.filter((d) => weekKey(d) === thisWeek).length;
  return { weekStreak, workoutsThisWeek, totalWorkouts: count ?? dates.length };
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

export interface StrengthGain {
  exercise_id: string;
  name: string;
  firstWeight: number;
  bestWeight: number;
  gainPct: number;
}

/**
 * "Since day one" — first-ever working weight vs all-time best per exercise.
 * The plainest possible proof that training works. Top gainers first.
 */
export async function getStrengthGains(limit = 3): Promise<StrengthGain[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("workout_sets")
    .select("exercise_id, weight, is_warmup, exercises(name), workouts!inner(owner_id, ended_at, started_at)")
    .eq("workouts.owner_id", user.id)
    .not("workouts.ended_at", "is", null)
    .eq("is_warmup", false)
    .not("weight", "is", null);

  interface Acc {
    name: string;
    firstDay: string;
    firstWeight: number;
    bestWeight: number;
  }
  const map = new Map<string, Acc>();
  for (const s of data ?? []) {
    if (s.weight == null) continue;
    const name = (s.exercises as unknown as { name: string } | null)?.name ?? "Exercise";
    const day = (s.workouts as unknown as { started_at: string }).started_at;
    const cur = map.get(s.exercise_id);
    if (!cur) {
      map.set(s.exercise_id, { name, firstDay: day, firstWeight: s.weight, bestWeight: s.weight });
      continue;
    }
    // Track the heaviest set of the earliest session as the baseline.
    if (day.slice(0, 10) < cur.firstDay.slice(0, 10)) {
      cur.firstDay = day;
      cur.firstWeight = s.weight;
    } else if (day.slice(0, 10) === cur.firstDay.slice(0, 10) && s.weight > cur.firstWeight) {
      cur.firstWeight = s.weight;
    }
    if (s.weight > cur.bestWeight) cur.bestWeight = s.weight;
  }

  return Array.from(map.entries())
    .map(([exercise_id, a]) => ({
      exercise_id,
      name: a.name,
      firstWeight: a.firstWeight,
      bestWeight: a.bestWeight,
      gainPct: a.firstWeight > 0 ? ((a.bestWeight - a.firstWeight) / a.firstWeight) * 100 : 0,
    }))
    .filter((g) => g.bestWeight > g.firstWeight)
    .sort((a, b) => b.gainPct - a.gainPct)
    .slice(0, limit);
}

export interface MuscleVolume {
  muscle_group: string;
  volume: number;
  prevVolume: number;
  sets: number;
}

/** Working volume per muscle group: last 7 days vs the 7 before (balance check). */
export async function getMuscleVolumeBreakdown(): Promise<MuscleVolume[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const now = Date.now();
  const since14 = new Date(now - 14 * 24 * 3600 * 1000).toISOString();
  const cutoff7 = now - 7 * 24 * 3600 * 1000;

  const { data } = await supabase
    .from("workout_sets")
    .select(
      "reps, weight, is_warmup, exercises(muscle_group), workouts!inner(owner_id, ended_at, started_at)",
    )
    .eq("workouts.owner_id", user.id)
    .not("workouts.ended_at", "is", null)
    .gte("workouts.started_at", since14)
    .eq("is_warmup", false);

  const map = new Map<string, MuscleVolume>();
  for (const s of data ?? []) {
    const muscle =
      (s.exercises as unknown as { muscle_group: string } | null)?.muscle_group ?? "Other";
    const startedAt = (s.workouts as unknown as { started_at: string }).started_at;
    const recent = new Date(startedAt).getTime() >= cutoff7;
    const cur =
      map.get(muscle) ?? { muscle_group: muscle, volume: 0, prevVolume: 0, sets: 0 };
    const v = setVolume(s.weight, s.reps);
    if (recent) {
      cur.volume += v;
      cur.sets++;
    } else {
      cur.prevVolume += v;
    }
    map.set(muscle, cur);
  }
  return Array.from(map.values())
    .filter((m) => m.volume > 0 || m.prevVolume > 0)
    .sort((a, b) => b.volume - a.volume);
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
