import { createClient } from "@/lib/supabase/server";
import type { Exercise } from "@/lib/database.types";

/** Seed list for the picker + a name lookup for the builder's existing rows. */
export async function loadBuilderData(existingIds: string[] = []): Promise<{
  library: Exercise[];
  names: Record<string, string>;
}> {
  const supabase = await createClient();
  const { data: library } = await supabase
    .from("exercises")
    .select("*")
    .order("name")
    .limit(50);

  const names: Record<string, string> = {};
  if (existingIds.length) {
    const { data } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", existingIds);
    for (const e of data ?? []) names[e.id] = e.name;
  }
  return { library: library ?? [], names };
}
