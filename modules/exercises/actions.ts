"use server";

import { createClient } from "@/lib/supabase/server";
import type { Exercise } from "@/lib/database.types";

/** Add a custom exercise; it becomes reusable in logging immediately (spec §5.2). */
export async function addCustomExercise(
  name: string,
  muscleGroup: string,
  equipment: string | null,
): Promise<{ exercise?: Exercise; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Name too short" };

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name: trimmed,
      muscle_group: muscleGroup,
      equipment,
      is_custom: true,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  return { exercise: data };
}

/** Search action callable from client components. */
export async function searchExercisesAction(query: string): Promise<Exercise[]> {
  const supabase = await createClient();
  let q = supabase.from("exercises").select("*").order("name").limit(50);
  if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
  const { data } = await q;
  return data ?? [];
}
