import type { Exercise, WorkoutSet } from "@/lib/database.types";

/** A previous set used to pre-fill the logger ("last time" numbers). */
export interface PreviousSet {
  set_index: number;
  reps: number | null;
  weight: number | null;
  is_warmup: boolean;
}

/** An exercise within an active session, with its sets and last-time data. */
export interface ActiveExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
  previous: PreviousSet[];
  /** Target sets × reps when the session came from a routine day. */
  target?: { sets: number; reps: number };
}
