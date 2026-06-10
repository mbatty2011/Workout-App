"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Start a session. If routineId + dayIndex are given, the session is tagged so
 * the logger can pre-load that day's exercises (spec §5.3 / §5.4). Reuses an
 * already-open workout rather than creating a duplicate.
 */
export async function startWorkout(
  routineId?: string,
  dayIndex?: number,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: existing } = await supabase
    .from("workouts")
    .select("id")
    .eq("owner_id", user.id)
    .is("ended_at", null)
    .maybeSingle();
  if (existing) return { id: existing.id };

  const { data, error } = await supabase
    .from("workouts")
    .insert({
      owner_id: user.id,
      routine_id: routineId ?? null,
      routine_day_index: dayIndex ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id };
}

export interface FinishMilestone {
  /** Total completed workouts including this one. */
  totalWorkouts: number;
  /** Days since the previous completed workout (null if this is the first). */
  daysSincePrev: number | null;
  /** The user's own reason for training, if they set one. */
  why: string | null;
  /** All-time working volume including this session. */
  lifetimeVolume: number;
}

export async function finishWorkout(
  workoutId: string,
  note?: string,
): Promise<{ error?: string; prs?: string[]; milestone?: FinishMilestone }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Compute PRs before closing: a top-set weight on any exercise that beats all
  // history from the user's other completed workouts (spec §5.5).
  const prs = await computePRs(workoutId, user.id);

  // Milestone context — gathered before closing so "previous" excludes this one.
  const [{ count: prevCount }, { data: prev }, { data: profile }] = await Promise.all([
    supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .not("ended_at", "is", null)
      .neq("id", workoutId),
    supabase
      .from("workouts")
      .select("started_at")
      .eq("owner_id", user.id)
      .not("ended_at", "is", null)
      .neq("id", workoutId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);

  const { error } = await supabase
    .from("workouts")
    .update({ ended_at: new Date().toISOString(), note: note ?? null })
    .eq("id", workoutId)
    .eq("owner_id", user.id);
  if (error) return { error: error.message };

  const daysSincePrev = prev
    ? Math.floor((Date.now() - new Date(prev.started_at).getTime()) / 86400000)
    : null;

  // Lifetime iron moved — makes "volume" visceral on the wrap-up.
  let lifetimeVolume = 0;
  const { data: allSets } = await supabase
    .from("workout_sets")
    .select("reps, weight, is_warmup, workouts!inner(owner_id, ended_at)")
    .eq("workouts.owner_id", user.id)
    .not("workouts.ended_at", "is", null)
    .eq("is_warmup", false);
  for (const s of allSets ?? []) {
    if (s.weight != null && s.reps != null) lifetimeVolume += s.weight * s.reps;
  }

  revalidatePath("/");
  revalidatePath("/progress");
  return {
    prs,
    milestone: {
      totalWorkouts: (prevCount ?? 0) + 1,
      daysSincePrev,
      why: (profile as { why?: string | null } | null)?.why ?? null,
      lifetimeVolume,
    },
  };
}

/**
 * Post-finish wrap-up: attach a note + photo to the workout, and optionally
 * share it to the feed as a post.
 */
export async function saveWorkoutWrapup(
  workoutId: string,
  input: {
    note: string;
    photoUrl: string | null;
    share: boolean;
    visibility: "public" | "followers" | "private";
  },
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("workouts")
    .update({ note: input.note.trim() || null, photo_url: input.photoUrl })
    .eq("id", workoutId)
    .eq("owner_id", user.id);
  if (error) return { error: error.message };

  if (input.share) {
    await supabase.from("posts").insert({
      owner_id: user.id,
      workout_id: workoutId,
      caption: input.note.trim() || null,
      photo_url: input.photoUrl,
      visibility: input.visibility,
    });
    revalidatePath("/feed");
  }

  revalidatePath("/");
  revalidatePath(`/workout/${workoutId}`);
  return {};
}

/** Upload a workout photo to Storage; returns a public URL. */
export async function uploadWorkoutPhoto(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "No file" };
  const isVideo = file.type.startsWith("video/");
  if (!isVideo && !file.type.startsWith("image/")) return { error: "Images or videos only" };
  const limit = isVideo ? 50 * 1024 * 1024 : 12 * 1024 * 1024;
  if (file.size > limit) {
    return { error: isVideo ? "Video too large (max 50MB)" : "Image too large (max 12MB)" };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("post-photos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from("post-photos").getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function discardWorkout(workoutId: string) {
  const supabase = await createClient();
  await supabase.from("workouts").delete().eq("id", workoutId);
  revalidatePath("/");
  redirect("/");
}

/** Returns the names of exercises that hit a weight PR in this workout. */
async function computePRs(workoutId: string, userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data: thisSets } = await supabase
    .from("workout_sets")
    .select("exercise_id, weight, is_warmup, exercises(name)")
    .eq("workout_id", workoutId);
  if (!thisSets || thisSets.length === 0) return [];

  // Best working weight per exercise in this session.
  const bestThis = new Map<string, { weight: number; name: string }>();
  for (const s of thisSets) {
    if (s.is_warmup || s.weight == null) continue;
    const name =
      (s.exercises as unknown as { name: string } | null)?.name ?? "Exercise";
    const cur = bestThis.get(s.exercise_id);
    if (!cur || s.weight > cur.weight) {
      bestThis.set(s.exercise_id, { weight: s.weight, name });
    }
  }

  const prs: string[] = [];
  for (const [exerciseId, { weight, name }] of bestThis) {
    const { data: prior } = await supabase
      .from("workout_sets")
      .select("weight, workouts!inner(owner_id, ended_at)")
      .eq("exercise_id", exerciseId)
      .eq("workouts.owner_id", userId)
      .not("workouts.ended_at", "is", null)
      .neq("workout_id", workoutId)
      .eq("is_warmup", false)
      .order("weight", { ascending: false })
      .limit(1)
      .maybeSingle();
    const priorBest = prior?.weight ?? 0;
    if (weight > priorBest) prs.push(name);
  }
  return prs;
}
