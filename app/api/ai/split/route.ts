import { NextResponse } from "next/server";
import { FEATURES } from "@/config/features";
import { createClient } from "@/lib/supabase/server";
import { getPopularContext } from "@/modules/ai/queries";
import { AnthropicSplitProvider } from "@/modules/ai/adapters/anthropic";
import type { Experience, Goal, SplitImage, SplitRequest } from "@/modules/ai/types";

const IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

/**
 * Generate a split. Accepts multipart form data so an optional physique photo
 * can be analyzed by vision. The Anthropic key stays server-side (spec §2); the
 * AI only suggests — the user confirms before saving (spec §5.7 guardrail).
 */
export async function POST(request: Request) {
  if (!FEATURES.aiSplitHelper) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI isn't configured yet. Add an ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const num = (k: string) => {
    const v = Number(form.get(k));
    return Number.isFinite(v) && v > 0 ? v : null;
  };

  const body: SplitRequest = {
    goal: (String(form.get("goal")) as Goal) || "hypertrophy",
    daysPerWeek: Number(form.get("daysPerWeek")) || 4,
    experience: (String(form.get("experience")) as Experience) || "intermediate",
    equipment: String(form.get("equipment") || "").split(",").filter(Boolean),
    currentWeight: num("currentWeight"),
    goalWeight: num("goalWeight"),
    bodyFatPct: num("bodyFatPct"),
    unit: String(form.get("unit") || "kg"),
  };

  if (body.daysPerWeek < 1 || body.daysPerWeek > 7) {
    return NextResponse.json({ error: "daysPerWeek must be 1–7" }, { status: 400 });
  }

  let image: SplitImage | undefined;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Photo too large (max 10MB)" }, { status: 400 });
    }
    if (!IMG.includes(photo.type as (typeof IMG)[number])) {
      return NextResponse.json({ error: "Use a JPG, PNG, or WebP photo" }, { status: 400 });
    }
    const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
    image = { base64, mediaType: photo.type as SplitImage["mediaType"] };
  }

  try {
    const popular = await getPopularContext();
    const provider = new AnthropicSplitProvider();
    const split = await provider.generateSplit(body, popular, image);
    return NextResponse.json({ split });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
