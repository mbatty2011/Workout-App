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

export async function deleteFoodLog(id: string) {
  const supabase = await createClient();
  await supabase.from("food_logs").delete().eq("id", id);
  revalidatePath("/food");
}
