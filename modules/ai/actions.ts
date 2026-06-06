"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RoutineDay } from "@/lib/database.types";
import type { GeneratedSplit } from "@/modules/ai/types";

/**
 * Resolve a generated split's exercise *names* to real exercise ids, creating
 * custom exercises for anything not already in the library, then save the
 * routine. The user has already confirmed at this point (spec §5.7 guardrail).
 */
export async function saveGeneratedSplit(
  split: GeneratedSplit,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Collect unique names and resolve against the library (case-insensitive).
  const names = Array.from(
    new Set(
      split.days.flatMap((d) => d.exercises.map((e) => e.name.trim())).filter(Boolean),
    ),
  );

  const idByName = new Map<string, string>();
  if (names.length) {
    const { data: matches } = await supabase
      .from("exercises")
      .select("id, name")
      .in("name", names);
    for (const m of matches ?? []) idByName.set(m.name.toLowerCase(), m.id);
  }

  // Create custom exercises for anything unmatched so the routine is usable.
  for (const name of names) {
    if (idByName.has(name.toLowerCase())) continue;
    const { data: created } = await supabase
      .from("exercises")
      .insert({
        name,
        muscle_group: "Full Body",
        is_custom: true,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (created) idByName.set(name.toLowerCase(), created.id);
  }

  const days: RoutineDay[] = split.days.map((d) => ({
    name: d.name,
    exercises: d.exercises
      .map((e) => {
        const id = idByName.get(e.name.trim().toLowerCase());
        return id
          ? { exercise_id: id, target_sets: e.target_sets, target_reps: e.target_reps }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  }));

  const { data, error } = await supabase
    .from("routines")
    .insert({
      owner_id: user.id,
      name: split.name,
      description: split.description,
      days,
      is_public: false,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/routines");
  return { id: data.id };
}
