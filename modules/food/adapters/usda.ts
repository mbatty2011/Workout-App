import type { NutritionItem, NutritionProvider } from "@/modules/food/adapters/types";

/**
 * USDA FoodData Central — generic foods. Free API key (spec §5.8 note).
 * Nutrient numbers: 1008 = energy (kcal), 1003 = protein, 1005 = carbs,
 * 1004 = total fat.
 */
export class UsdaProvider implements NutritionProvider {
  constructor(private apiKey = process.env.USDA_API_KEY) {}

  async search(query: string, limit = 15): Promise<NutritionItem[]> {
    if (!this.apiKey) return []; // Gracefully degrade to OFF only.
    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("query", query);
    url.searchParams.set("pageSize", String(limit));
    url.searchParams.set("dataType", "Foundation,SR Legacy,Branded");

    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { foods?: UsdaFood[] };

    return (data.foods ?? []).map((f) => {
      const get = (id: number) =>
        f.foodNutrients?.find((n) => n.nutrientId === id)?.value ?? null;
      return {
        source: "usda" as const,
        external_id: String(f.fdcId),
        name: f.description,
        brand: f.brandOwner ?? null,
        serving:
          f.servingSize && f.servingSizeUnit
            ? `${f.servingSize}${f.servingSizeUnit}`
            : "100g",
        calories: get(1008),
        protein_g: get(1003),
        carbs_g: get(1005),
        fat_g: get(1004),
      };
    });
  }
}

interface UsdaFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: { nutrientId: number; value: number }[];
}
