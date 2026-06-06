import { createAdminClient } from "@/lib/supabase/admin";
import type { Food } from "@/lib/database.types";
import type { NutritionItem, NutritionProvider } from "@/modules/food/adapters/types";
import { UsdaProvider } from "@/modules/food/adapters/usda";
import { OpenFoodFactsProvider } from "@/modules/food/adapters/openfoodfacts";

/**
 * The one provider feature code talks to. Fans out to USDA + Open Food Facts as
 * fallbacks within a single adapter (spec §5.8), then caches results into the
 * shared `foods` table to cut future API calls. Swapping data sources happens
 * here — never in the food feature UI.
 */
export class CombinedNutritionProvider implements NutritionProvider {
  private providers: NutritionProvider[];

  constructor(providers?: NutritionProvider[]) {
    this.providers =
      providers ?? [new UsdaProvider(), new OpenFoodFactsProvider()];
  }

  async search(query: string, limit = 20): Promise<NutritionItem[]> {
    const settled = await Promise.allSettled(
      this.providers.map((p) => p.search(query, limit)),
    );
    const items = settled.flatMap((r) =>
      r.status === "fulfilled" ? r.value : [],
    );
    // De-dupe by source+external_id.
    const seen = new Set<string>();
    return items.filter((i) => {
      const key = `${i.source}:${i.external_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

/**
 * Cache search hits into `foods` and return the persisted rows (with ids) so
 * the client can log against a stable food_id. Uses the service role because
 * the cache is shared, public nutrition data (spec §4 foods table).
 */
export async function cacheFoods(items: NutritionItem[]): Promise<Food[]> {
  if (items.length === 0) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("foods")
    .upsert(
      items.map((i) => ({
        source: i.source,
        external_id: i.external_id,
        name: i.name,
        brand: i.brand,
        serving: i.serving,
        calories: i.calories,
        protein_g: i.protein_g,
        carbs_g: i.carbs_g,
        fat_g: i.fat_g,
      })),
      { onConflict: "source,external_id" },
    )
    .select("*");
  if (error) return [];
  return data ?? [];
}
