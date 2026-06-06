"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Meal, Visibility } from "@/lib/database.types";
import { MEAL_LABELS, sumLogs, type FoodLogWithFood } from "@/modules/food/constants";
import { getFoodLogsForDay } from "@/modules/food/queries";

/** When logging to a non-today day, anchor the timestamp at local noon. */
function loggedAtFor(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  return new Date(`${dateStr}T12:00:00`).toISOString();
}

export async function logFood(
  foodId: string,
  meal: Meal,
  servings: number,
  dateStr?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const logged_at = loggedAtFor(dateStr);
  const { error } = await supabase.from("food_logs").insert({
    owner_id: user.id,
    food_id: foodId,
    meal,
    servings: servings > 0 ? servings : 1,
    ...(logged_at ? { logged_at } : {}),
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
  dateStr?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

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

  const logged_at = loggedAtFor(dateStr);
  const { error } = await supabase.from("food_logs").insert({
    owner_id: user.id,
    food_id: created.id,
    meal,
    servings: servings > 0 ? servings : 1,
    ...(logged_at ? { logged_at } : {}),
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

/** Build the caption used when sharing a day's nutrition to the feed. */
function buildDayCaption(logs: FoodLogWithFood[], dateStr: string): string {
  const t = sumLogs(logs);
  const date = new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const lines = [
    `🍽️ ${date}`,
    `${Math.round(t.calories)} kcal · ${Math.round(t.protein)}g protein · ${Math.round(t.carbs)}g carbs · ${Math.round(t.fat)}g fat`,
    "",
  ];
  for (const meal of ["breakfast", "lunch", "dinner", "snack"] as Meal[]) {
    const items = logs.filter((l) => l.meal === meal);
    if (items.length === 0) continue;
    const names = items.map((l) => l.food?.name).filter(Boolean).join(", ");
    lines.push(`${MEAL_LABELS[meal]}: ${names}`);
  }
  return lines.join("\n").trim();
}

/** Share a day's meals + macros to the social feed. */
export async function shareDayNutrition(
  dateStr: string,
  visibility: Visibility,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const logs = await getFoodLogsForDay(dateStr);
  if (logs.length === 0) return { error: "Nothing logged for this day yet" };

  const caption = buildDayCaption(logs, dateStr);
  const { error } = await supabase.from("posts").insert({
    owner_id: user.id,
    caption,
    visibility,
  });
  if (error) return { error: error.message };
  revalidatePath("/feed");
  return {};
}
