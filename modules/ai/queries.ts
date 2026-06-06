import { createClient } from "@/lib/supabase/server";
import type { PopularContext } from "@/modules/ai/types";

/**
 * "Based on what people are using" (spec §5.7): the most-common exercises
 * across public routines, aggregated and anonymized (no owner identity).
 */
export async function getPopularContext(limit = 40): Promise<PopularContext[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("popular_exercise_pairs")
    .select("*")
    .order("usage_count", { ascending: false })
    .limit(limit);
  return (data ?? [])
    .filter((r) => r.exercise_name && r.muscle_group)
    .map((r) => ({
      exercise_name: r.exercise_name as string,
      muscle_group: r.muscle_group as string,
      usage_count: r.usage_count ?? 0,
    }));
}
