"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Meal } from "@/lib/database.types";

export async function logFood(
  foodId: string,
  meal: Meal,
  servings: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase.from("food_logs").insert({
    owner_id: user.id,
    food_id: foodId,
    meal,
    servings: servings > 0 ? servings : 1,
  });
  if (error) return { error: error.message };
  revalidatePath("/food");
  return {};
}

/** Persist an AI-scanned food into the cache, then log it to a meal. */
export async function logScannedFood(
  food: {
    name: string;
    serving: string;
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  },
  meal: Meal,
  servings: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Scanned items live in the shared food cache. Reuse the 'off' source with a
  // unique synthetic id so no schema change is needed.
  const { data: created, error: foodErr } = await supabase
    .from("foods")
    .insert({
      source: "off",
      external_id: `scan:${crypto.randomUUID()}`,
      name: food.name,
      serving: food.serving,
      calories: food.calories,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
    })
    .select("id")
    .single();
  if (foodErr || !created) return { error: foodErr?.message ?? "Could not save food" };

  const { error } = await supabase.from("food_logs").insert({
    owner_id: user.id,
    food_id: created.id,
    meal,
    servings: servings > 0 ? servings : 1,
  });
  if (error) return { error: error.message };
  revalidatePath("/food");
  return {};
}

export async function deleteFoodLog(id: string) {
  const supabase = await createClient();
  await supabase.from("food_logs").delete().eq("id", id);
  revalidatePath("/food");
}
