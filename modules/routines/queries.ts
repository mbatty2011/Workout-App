import { createClient } from "@/lib/supabase/server";
import type { Routine } from "@/lib/database.types";

export async function listRoutines(): Promise<Routine[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("routines")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("routines").select("*").eq("id", id).maybeSingle();
  return data;
}
