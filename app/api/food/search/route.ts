import { NextResponse } from "next/server";
import { FEATURES } from "@/config/features";
import { createClient } from "@/lib/supabase/server";
import {
  CombinedNutritionProvider,
  cacheFoods,
} from "@/modules/food/adapters";

/**
 * Food search: hit the cache first, then fall through to the combined provider
 * (USDA + Open Food Facts), caching new hits (spec §5.8). Returns persisted
 * `foods` rows so the client can log against a stable id.
 */
export async function GET(request: Request) {
  if (!FEATURES.foodTracker) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ foods: [] });

  // Cache-first.
  const { data: cached } = await supabase
    .from("foods")
    .select("*")
    .ilike("name", `%${q}%`)
    .limit(20);

  if (cached && cached.length >= 8) {
    return NextResponse.json({ foods: cached });
  }

  try {
    const provider = new CombinedNutritionProvider();
    const items = await provider.search(q);
    const fresh = await cacheFoods(items);
    // Merge cache + fresh, de-duped by id.
    const byId = new Map((cached ?? []).map((f) => [f.id, f]));
    for (const f of fresh) byId.set(f.id, f);
    return NextResponse.json({ foods: Array.from(byId.values()) });
  } catch {
    // Network/provider failure — still serve whatever cache we had.
    return NextResponse.json({ foods: cached ?? [] });
  }
}
