import { NextResponse } from "next/server";
import { FEATURES } from "@/config/features";
import { createClient } from "@/lib/supabase/server";
import { getGoalsWithProgress } from "@/modules/goals/queries";
import {
  NutritionVisionProvider,
  type PlanContext,
} from "@/modules/ai/adapters/nutritionVision";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type Allowed = (typeof ALLOWED)[number];

/**
 * Scan a nutrition-label photo: Claude vision extracts the macros, and we pass
 * the user's remaining daily calorie/protein budget so the verdict reflects
 * their actual plan (spec §5.8, extended).
 */
export async function POST(request: Request) {
  if (!FEATURES.foodTracker) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Photo scanning isn't configured yet. Add an ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No photo provided" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max 10MB)" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type as Allowed)) {
    return NextResponse.json({ error: "Use a JPG, PNG, or WebP image" }, { status: 400 });
  }

  // Remaining daily budget from the user's calorie/protein goals.
  let plan: PlanContext = {
    remainingCalories: null,
    remainingProtein: null,
    calorieTarget: null,
    proteinTarget: null,
  };
  try {
    const goals = await getGoalsWithProgress();
    const cal = goals.find((g) => g.goal.type === "calorie");
    const pro = goals.find((g) => g.goal.type === "protein");
    plan = {
      calorieTarget: cal?.target ?? null,
      proteinTarget: pro?.target ?? null,
      remainingCalories: cal ? Math.round(cal.target - cal.current) : null,
      remainingProtein: pro ? Math.round(pro.target - pro.current) : null,
    };
  } catch {
    // Goals are optional; proceed without plan context.
  }

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const provider = new NutritionVisionProvider();
    const result = await provider.scan(base64, file.type as Allowed, plan);
    return NextResponse.json({ result, plan });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not read the label";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
