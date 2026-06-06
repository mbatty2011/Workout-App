import { createClient } from "@/lib/supabase/server";
import type { Exercise } from "@/lib/database.types";

/**
 * Search the exercise library (seeded + the user's custom lifts). RLS already
 * scopes custom exercises to their creator, so we never leak other users'.
 */
export async function searchExercises(query: string, limit = 50): Promise<Exercise[]> {
  const supabase = await createClient();
  let q = supabase.from("exercises").select("*").order("name").limit(limit);
  if (query.trim()) {
    q = q.ilike("name", `%${query.trim()}%`);
  }
  const { data } = await q;
  return data ?? [];
}

export async function listExercisesByMuscle(): Promise<Record<string, Exercise[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .order("muscle_group")
    .order("name");
  const grouped: Record<string, Exercise[]> = {};
  for (const ex of data ?? []) {
    (grouped[ex.muscle_group] ??= []).push(ex);
  }
  return grouped;
}

export async function getExerciseMap(ids: string[]): Promise<Map<string, Exercise>> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .in("id", Array.from(new Set(ids)));
  return new Map((data ?? []).map((e) => [e.id, e]));
}
