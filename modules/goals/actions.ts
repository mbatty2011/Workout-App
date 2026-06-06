"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GoalType, Unit } from "@/lib/database.types";

export async function setGoal(
  type: GoalType,
  target: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  if (!(target > 0)) return { error: "Target must be greater than zero" };

  // One active goal per type: replace any existing.
  await supabase.from("goals").delete().eq("owner_id", user.id).eq("type", type);
  const { error } = await supabase
    .from("goals")
    .insert({ owner_id: user.id, type, target, period: type === "workouts_per_week" ? "week" : "day" });
  if (error) return { error: error.message };
  revalidatePath("/goals");
  revalidatePath("/");
  return {};
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  await supabase.from("goals").delete().eq("id", id);
  revalidatePath("/goals");
}

export async function logWeight(
  weight: number,
  unit: Unit,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  if (!(weight > 0)) return { error: "Enter a valid weight" };

  const { error } = await supabase
    .from("weight_logs")
    .insert({ owner_id: user.id, weight, unit });
  if (error) return { error: error.message };
  revalidatePath("/goals");
  return {};
}
