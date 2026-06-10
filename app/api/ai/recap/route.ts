import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { FEATURES } from "@/config/features";
import { createClient } from "@/lib/supabase/server";
import { estimate1RM, setVolume } from "@/lib/utils";

/**
 * AI weekly coach recap. On-demand only (user taps a button) so API spend is
 * controlled and predictable — this is the feature a small price tier covers.
 * Gathers the last 7 days of training + nutrition + bodyweight and asks Claude
 * for a short, specific, encouraging recap with one concrete focus.
 */
export async function POST() {
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

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceISO = since.toISOString();

  // Training: completed workouts + sets in the window.
  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, started_at, ended_at")
    .eq("owner_id", user.id)
    .not("ended_at", "is", null)
    .gte("started_at", sinceISO);
  const workoutIds = (workouts ?? []).map((w) => w.id);

  let totalSets = 0;
  let totalVolume = 0;
  const perExercise = new Map<string, { name: string; bestE1rm: number; sets: number }>();
  if (workoutIds.length) {
    const { data: sets } = await supabase
      .from("workout_sets")
      .select("exercise_id, reps, weight, is_warmup, exercises(name)")
      .in("workout_id", workoutIds)
      .eq("is_warmup", false);
    for (const s of sets ?? []) {
      totalSets++;
      totalVolume += setVolume(s.weight, s.reps);
      const name = (s.exercises as unknown as { name: string } | null)?.name ?? "Exercise";
      const cur = perExercise.get(s.exercise_id) ?? { name, bestE1rm: 0, sets: 0 };
      cur.sets++;
      const e = estimate1RM(s.weight, s.reps) ?? 0;
      if (e > cur.bestE1rm) cur.bestE1rm = e;
      perExercise.set(s.exercise_id, cur);
    }
  }
  const topLifts = Array.from(perExercise.values())
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 6)
    .map((e) => `${e.name}: ${e.sets} sets, best est. 1RM ${Math.round(e.bestE1rm)}`)
    .join("; ");

  // Nutrition: daily kcal/protein averages over days that have logs.
  const { data: foodLogs } = await supabase
    .from("food_logs")
    .select("logged_at, servings, food:foods(calories, protein_g)")
    .eq("owner_id", user.id)
    .gte("logged_at", sinceISO);
  const byDay = new Map<string, { kcal: number; protein: number }>();
  for (const l of foodLogs ?? []) {
    const day = l.logged_at.slice(0, 10);
    const f = l.food as unknown as { calories: number | null; protein_g: number | null } | null;
    const cur = byDay.get(day) ?? { kcal: 0, protein: 0 };
    cur.kcal += (f?.calories ?? 0) * l.servings;
    cur.protein += (f?.protein_g ?? 0) * l.servings;
    byDay.set(day, cur);
  }
  const loggedDays = byDay.size;
  const avgKcal = loggedDays
    ? Math.round(Array.from(byDay.values()).reduce((a, d) => a + d.kcal, 0) / loggedDays)
    : 0;
  const avgProtein = loggedDays
    ? Math.round(Array.from(byDay.values()).reduce((a, d) => a + d.protein, 0) / loggedDays)
    : 0;

  // Goals + weight trend.
  const { data: goals } = await supabase
    .from("goals")
    .select("type, target")
    .eq("owner_id", user.id);
  const goalLine = (goals ?? []).map((g) => `${g.type}: ${g.target}`).join(", ");

  const { data: weights } = await supabase
    .from("weight_logs")
    .select("weight, unit, logged_at")
    .eq("owner_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(2);
  const weightLine =
    weights && weights.length
      ? `latest bodyweight ${weights[0].weight}${weights[0].unit}` +
        (weights.length > 1 ? ` (prev ${weights[1].weight}${weights[1].unit})` : "")
      : "no bodyweight logged";

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `You are a friendly, no-nonsense gym coach inside a workout app. Write a short weekly recap (max ~120 words) for this athlete based on their last 7 days. Be specific to the numbers, celebrate what's working, and end with exactly ONE concrete focus for next week. No headers, no bullet lists, no emojis except at most one. Plain encouraging prose.

Training: ${workoutIds.length} workouts, ${totalSets} working sets, ${Math.round(totalVolume).toLocaleString()} total volume.
Top lifts: ${topLifts || "none logged"}.
Nutrition: logged ${loggedDays}/7 days, averaging ${avgKcal} kcal and ${avgProtein}g protein on logged days.
Goals: ${goalLine || "none set"}.
Bodyweight: ${weightLine}.`,
        },
      ],
    });
    const text = msg.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("\n")
      .trim();
    return NextResponse.json({ recap: text });
  } catch (err) {
    const m = err instanceof Error ? err.message : "Coach is unavailable right now";
    return NextResponse.json({ error: m }, { status: 500 });
  }
}
