import type { RoutineDay } from "@/lib/database.types";

export type Goal = "strength" | "hypertrophy" | "general_fitness" | "fat_loss";
export type Experience = "beginner" | "intermediate" | "advanced";

/** Inputs that drive a generated split (spec §5.7, extended). */
export interface SplitRequest {
  goal: Goal;
  daysPerWeek: number;
  equipment: string[];
  experience: Experience;
  // Optional context — the more provided, the more tailored the split.
  currentWeight?: number | null;
  goalWeight?: number | null;
  bodyFatPct?: number | null;
  unit?: string;
}

/** Optional physique photo for vision-based focus analysis. */
export interface SplitImage {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

/** Aggregated, anonymized popular usage passed as grounding context. */
export interface PopularContext {
  exercise_name: string;
  muscle_group: string;
  usage_count: number;
}

/** A generated split the user can edit + save with one tap. */
export interface GeneratedSplit {
  name: string;
  description: string;
  days: GeneratedDay[];
}

export interface GeneratedDay {
  name: string;
  exercises: GeneratedExercise[];
}

export interface GeneratedExercise {
  name: string;
  target_sets: number;
  target_reps: number;
}

/**
 * Single adapter interface for the AI provider (spec §2): a provider can be
 * swapped without touching feature code.
 */
export interface AISplitProvider {
  generateSplit(
    request: SplitRequest,
    popular: PopularContext[],
    image?: SplitImage,
  ): Promise<GeneratedSplit>;
}

/** Map a generated split onto routine day shape once exercises are resolved. */
export type ResolvedDays = RoutineDay[];
