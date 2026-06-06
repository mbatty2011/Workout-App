import type { FoodSource } from "@/lib/database.types";

/** Normalized nutrition item — the shape every provider returns (spec §2). */
export interface NutritionItem {
  source: FoodSource;
  external_id: string;
  name: string;
  brand: string | null;
  serving: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

/**
 * Single adapter interface for food data (spec §2 / §5.8). USDA and Open Food
 * Facts both implement this; the combined provider fans out and merges so a
 * source can be swapped or removed without touching feature code.
 */
export interface NutritionProvider {
  search(query: string, limit?: number): Promise<NutritionItem[]>;
}
