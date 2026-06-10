"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RoutineDay } from "@/lib/database.types";

export async function saveRoutine(input: {
  id?: string;
  name: string;
  description: string;
  days: RoutineDay[];
  is_public: boolean;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  if (!input.name.trim()) return { error: "Give your split a name" };

  if (input.id) {
    const { error } = await supabase
      .from("routines")
      .update({
        name: input.name.trim(),
        description: input.description,
        days: input.days,
        is_public: input.is_public,
      })
      .eq("id", input.id)
      .eq("owner_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/routines");
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("routines")
    .insert({
      owner_id: user.id,
      name: input.name.trim(),
      description: input.description,
      days: input.days,
      is_public: input.is_public,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/routines");
  return { id: data.id };
}

/**
 * The Day-One path: one tap creates "Foundation", a simple 3-day full-body
 * beginner split built from the seeded library — no building, no decisions.
 * Returns the routine id so the caller can launch day 0 immediately.
 */
const STARTER_DAYS: { name: string; moves: [string, number, number][] }[] = [
  {
    name: "Foundation A",
    moves: [
      ["Goblet Squat", 3, 10],
      ["Machine Chest Press", 3, 10],
      ["Lat Pulldown", 3, 10],
      ["Seated Leg Curl", 3, 12],
      ["Dumbbell Lateral Raise", 2, 15],
      ["Machine Crunch", 3, 15],
    ],
  },
  {
    name: "Foundation B",
    moves: [
      ["Leg Press", 3, 10],
      ["Seated Cable Row", 3, 10],
      ["Dumbbell Bench Press", 3, 10],
      ["Dumbbell Romanian Deadlift", 3, 10],
      ["Cable Curl", 2, 12],
      ["Rope Pushdown", 2, 12],
    ],
  },
  {
    name: "Foundation C",
    moves: [
      ["Hack Squat", 3, 10],
      ["Machine Shoulder Press", 3, 10],
      ["Machine Row", 3, 10],
      ["Leg Extension", 3, 12],
      ["Hammer Curl", 2, 12],
      ["Cable Crunch", 3, 12],
    ],
  },
];

export async function createStarterRoutine(): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Reuse if they already have it.
  const { data: existing } = await supabase
    .from("routines")
    .select("id")
    .eq("owner_id", user.id)
    .eq("name", "Foundation")
    .maybeSingle();
  if (existing) return { id: existing.id };

  const names = Array.from(new Set(STARTER_DAYS.flatMap((d) => d.moves.map((m) => m[0]))));
  const { data: found } = await supabase
    .from("exercises")
    .select("id, name")
    .in("name", names)
    .eq("is_custom", false);
  const idByName = new Map((found ?? []).map((e) => [e.name, e.id]));

  const days: RoutineDay[] = STARTER_DAYS.map((d) => ({
    name: d.name,
    exercises: d.moves
      .map(([name, sets, reps]) => {
        const id = idByName.get(name);
        return id ? { exercise_id: id, target_sets: sets, target_reps: reps } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  }));

  const { data, error } = await supabase
    .from("routines")
    .insert({
      owner_id: user.id,
      name: "Foundation",
      description: "3 days a week. Simple movements. Your only job is to show up.",
      days,
      is_public: false,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/routines");
  return { id: data.id };
}

export async function deleteRoutine(id: string) {
  const supabase = await createClient();
  await supabase.from("routines").delete().eq("id", id);
  revalidatePath("/routines");
  redirect("/routines");
}
