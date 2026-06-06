import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/modules/auth/queries";
import { PageHeader } from "@/components/ui";
import { Logger } from "@/modules/workouts/components/Logger";
import { startWorkout } from "@/modules/workouts/actions";
import {
  getActiveWorkout,
  getWorkoutSets,
  getPreviousSets,
} from "@/modules/workouts/queries";
import { getExerciseMap } from "@/modules/exercises/queries";
import type { ActiveExercise } from "@/modules/workouts/types";
import type { Exercise, RoutineDay } from "@/lib/database.types";

export default async function WorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ routine?: string; day?: string }>;
}) {
  if (!FEATURES.workoutLogging) redirect("/");
  const { routine, day } = await searchParams;

  // Ensure exactly one active session exists.
  let active = await getActiveWorkout();
  if (!active) {
    const res = await startWorkout(routine, day ? Number(day) : undefined);
    if (res.error || !res.id) {
      return <p className="text-danger">Could not start a workout: {res.error}</p>;
    }
    active = await getActiveWorkout();
  }
  if (!active) redirect("/");

  const profile = await getCurrentProfile();
  const unit = profile?.unit ?? "kg";

  // Build the initial set of exercises: existing logged sets, plus — if this
  // session came from a routine day and is still empty — that day's exercises.
  const existingSets = await getWorkoutSets(active.id);
  const exerciseIds = new Set(existingSets.map((s) => s.exercise_id));

  let routineDayExerciseIds: string[] = [];
  if (
    active.routine_id &&
    active.routine_day_index != null &&
    existingSets.length === 0
  ) {
    const supabase = await createClient();
    const { data: r } = await supabase
      .from("routines")
      .select("days")
      .eq("id", active.routine_id)
      .maybeSingle();
    const days = (r?.days ?? []) as RoutineDay[];
    const dayDef = days[active.routine_day_index];
    routineDayExerciseIds = (dayDef?.exercises ?? []).map((e) => e.exercise_id);
    routineDayExerciseIds.forEach((id) => exerciseIds.add(id));
  }

  const exMap = await getExerciseMap(Array.from(exerciseIds));
  const previous = await getPreviousSets(Array.from(exerciseIds), active.id);

  // Order: routine-day exercises first (if any), else by first-logged order.
  const orderedIds = routineDayExerciseIds.length
    ? routineDayExerciseIds
    : Array.from(exerciseIds);

  const initialExercises: ActiveExercise[] = orderedIds
    .map((id) => exMap.get(id))
    .filter((e): e is Exercise => Boolean(e))
    .map((exercise) => ({
      exercise,
      sets: existingSets.filter((s) => s.exercise_id === exercise.id),
      previous: previous[exercise.id] ?? [],
    }));

  // A small library to seed the picker before the user searches.
  const supabase = await createClient();
  const { data: library } = await supabase
    .from("exercises")
    .select("*")
    .order("name")
    .limit(50);

  return (
    <div>
      <Logger
        workoutId={active.id}
        startedAt={active.started_at}
        initialExercises={initialExercises}
        unit={unit}
        exerciseLibrary={library ?? []}
      />
    </div>
  );
}
