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

export async function deleteRoutine(id: string) {
  const supabase = await createClient();
  await supabase.from("routines").delete().eq("id", id);
  revalidatePath("/routines");
  redirect("/routines");
}
