import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

/** The signed-in user's id, or null. Never throws — a config/network error
 * is treated as "not signed in" so entry pages still render. */
export async function getUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/** The signed-in user's profile, or null if not yet onboarded / on error. */
export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}
