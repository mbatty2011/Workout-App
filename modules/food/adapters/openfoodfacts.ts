import type { NutritionItem, NutritionProvider } from "@/modules/food/adapters/types";

/**
 * Open Food Facts — branded/global foods. Open, no API key (spec §5.8 note).
 * Nutriments are per 100g; we surface that as the serving basis.
 */
export class OpenFoodFactsProvider implements NutritionProvider {
  async search(query: string, limit = 15): Promise<NutritionItem[]> {
    const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
    url.searchParams.set("search_terms", query);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("page_size", String(limit));
    url.searchParams.set(
      "fields",
      "code,product_name,brands,nutriments,serving_size",
    );

    const res = await fetch(url, {
      headers: { "User-Agent": "yours-gym-app/0.1 (nutrition lookup)" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { products?: OffProduct[] };

    return (data.products ?? [])
      .filter((p) => p.product_name && p.nutriments)
      .map((p) => {
        const n = p.nutriments!;
        return {
          source: "off" as const,
          external_id: p.code,
          name: p.product_name!,
          brand: p.brands ?? null,
          serving: p.serving_size ?? "100g",
          calories: num(n["energy-kcal_100g"]),
          protein_g: num(n.proteins_100g),
          carbs_g: num(n.carbohydrates_100g),
          fat_g: num(n.fat_100g),
        };
      });
  }
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

interface OffProduct {
  code: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number | string>;
}
