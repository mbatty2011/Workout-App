import Link from "next/link";
import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { getCurrentProfile } from "@/modules/auth/queries";
import { listLoggedExercises, getWeekSummary } from "@/modules/progress/queries";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui";

export default async function ProgressPage() {
  if (!FEATURES.progress) redirect("/");
  const profile = await getCurrentProfile();
  const unit = profile?.unit ?? "kg";
  const [exercises, week] = await Promise.all([
    listLoggedExercises(),
    getWeekSummary(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Progress" subtitle="Your numbers over time." />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Workouts / wk" value={`${week.workouts}`} />
        <Stat label="Sets / wk" value={`${week.sets}`} />
        <Stat label="Volume / wk" value={`${Math.round(week.volume).toLocaleString()}`} />
      </div>

      {exercises.length === 0 ? (
        <EmptyState
          title="No data yet"
          subtitle="Log a few sessions and your per-exercise charts and PRs show up here."
        />
      ) : (
        <ul className="space-y-2">
          {exercises.map((e) => (
            <li key={e.exercise_id}>
              <Link href={`/progress/${e.exercise_id}`}>
                <Card className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{e.name}</p>
                    <p className="text-xs text-muted">{e.muscle_group}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="tabular">
                      {e.best_weight ?? "–"}
                      {unit} best
                    </p>
                    <p className="tabular text-xs text-muted">
                      ~{e.best_e1rm ?? "–"}
                      {unit} 1RM
                    </p>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
