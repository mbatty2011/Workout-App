import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/user";
import type { Profile } from "@/lib/database.types";

/** The signed-in user's id, or null. Never throws. */
export async function getUserId(): Promise<string | null> {
  try {
    const user = await getCachedUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * The signed-in user's profile, or null if not yet onboarded / on error.
 * Memoized per request so the layout and page don't double-fetch it.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  try {
    const user = await getCachedUser();
    if (!user) return null;
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
});
