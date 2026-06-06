import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Per-request memoized current user. `supabase.auth.getUser()` makes a network
 * round-trip to verify the JWT, and it gets called from the layout *and* most
 * pages on every navigation. React's cache() dedupes it to a single call per
 * server render, cutting a big chunk of navigation latency.
 */
export const getCachedUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
