import { createClient } from "@/lib/supabase/server";
import type { Workout, WorkoutSet } from "@/lib/database.types";
import type { PreviousSet } from "@/modules/workouts/types";

/** The user's open (not yet ended) workout, if any. */
export async function getActiveWorkout(): Promise<Workout | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("workouts")
    .select("*")
    .eq("owner_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getWorkout(id: string): Promise<Workout | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("workouts").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getWorkoutSets(workoutId: string): Promise<WorkoutSet[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("workout_id", workoutId)
    .order("set_index");
  return data ?? [];
}

export async function listRecentWorkouts(limit = 10): Promise<Workout[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("workouts")
    .select("*")
    .eq("owner_id", user.id)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Previous-session autofill (spec §5.3): for each exercise id, return the
 * working sets from the most recent *other* completed workout that used it.
 */
export async function getPreviousSets(
  exerciseIds: string[],
  excludeWorkoutId?: string,
): Promise<Record<string, PreviousSet[]>> {
  const out: Record<string, PreviousSet[]> = {};
  if (exerciseIds.length === 0) return out;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return out;

  for (const exerciseId of exerciseIds) {
    // Find the most recent workout (excluding the current) that has this exercise.
    let workoutQuery = supabase
      .from("workout_sets")
      .select("workout_id, workouts!inner(owner_id, started_at, ended_at)")
      .eq("exercise_id", exerciseId)
      .eq("workouts.owner_id", user.id)
      .not("workouts.ended_at", "is", null)
      .order("workouts(started_at)", { ascending: false })
      .limit(1);
    if (excludeWorkoutId) {
      workoutQuery = workoutQuery.neq("workout_id", excludeWorkoutId);
    }
    const { data: latest } = await workoutQuery.maybeSingle();
    if (!latest?.workout_id) {
      out[exerciseId] = [];
      continue;
    }

    const { data: sets } = await supabase
      .from("workout_sets")
      .select("set_index, reps, weight, is_warmup")
      .eq("workout_id", latest.workout_id)
      .eq("exercise_id", exerciseId)
      .order("set_index");
    out[exerciseId] = sets ?? [];
  }
  return out;
}
