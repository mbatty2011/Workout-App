import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import { getWorkout, getWorkoutSets } from "@/modules/workouts/queries";
import { getExerciseMap } from "@/modules/exercises/queries";
import { getCurrentProfile } from "@/modules/auth/queries";
import { Card, LinkButton, PageHeader, Pill } from "@/components/ui";
import { MediaView } from "@/components/MediaView";
import { setVolume } from "@/lib/utils";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workout = await getWorkout(id);
  if (!workout) notFound();

  const [sets, profile] = await Promise.all([
    getWorkoutSets(id),
    getCurrentProfile(),
  ]);
  const unit = profile?.unit ?? "kg";
  const exMap = await getExerciseMap(sets.map((s) => s.exercise_id));

  // Group sets by exercise, preserving first-seen order.
  const order: string[] = [];
  const grouped = new Map<string, typeof sets>();
  for (const s of sets) {
    if (!grouped.has(s.exercise_id)) {
      grouped.set(s.exercise_id, []);
      order.push(s.exercise_id);
    }
    grouped.get(s.exercise_id)!.push(s);
  }

  const totalVolume = sets.reduce(
    (acc, s) => acc + (s.is_warmup ? 0 : setVolume(s.weight, s.reps)),
    0,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={new Date(workout.started_at).toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
        subtitle={[
          workout.ended_at
            ? `${Math.max(1, Math.round((new Date(workout.ended_at).getTime() - new Date(workout.started_at).getTime()) / 60000))} min`
            : null,
          `${order.length} exercises`,
          `${Math.round(totalVolume).toLocaleString()} ${unit} volume`,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          FEATURES.socialFeed && workout.ended_at ? (
            <LinkButton href={`/feed/new?workout=${workout.id}`} size="sm">
              Post
            </LinkButton>
          ) : !workout.ended_at ? (
            <LinkButton href="/workout" size="sm">
              Resume
            </LinkButton>
          ) : undefined
        }
      />

      {workout.photo_url && (
        <MediaView url={workout.photo_url} controls className="aspect-square w-full rounded-2xl object-cover" />
      )}

      {workout.note && <Card className="text-sm text-muted">{workout.note}</Card>}

      {order.map((exId) => {
        const ex = exMap.get(exId);
        const exSets = grouped.get(exId) ?? [];
        return (
          <Card key={exId} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{ex?.name ?? "Exercise"}</h3>
              <Pill tone="muted">{ex?.muscle_group}</Pill>
            </div>
            {exSets.map((s) => (
              <div
                key={s.id}
                className="tabular flex items-center justify-between text-sm text-muted"
              >
                <span>{s.is_warmup ? "Warm-up" : `Set ${s.set_index}`}</span>
                <span>
                  {s.weight ?? "–"}
                  {unit} × {s.reps ?? "–"}
                  {s.rpe != null && <span className="ml-2">@{s.rpe}</span>}
                </span>
              </div>
            ))}
          </Card>
        );
      })}
    </div>
  );
}
