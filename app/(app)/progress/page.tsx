import Link from "next/link";
import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { getCurrentProfile } from "@/modules/auth/queries";
import {
  listLoggedExercises,
  getWeekSummary,
  getMuscleVolumeBreakdown,
} from "@/modules/progress/queries";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui";

export default async function ProgressPage() {
  if (!FEATURES.progress) redirect("/");
  const profile = await getCurrentProfile();
  const unit = profile?.unit ?? "kg";
  const [exercises, week, muscles] = await Promise.all([
    listLoggedExercises(),
    getWeekSummary(),
    getMuscleVolumeBreakdown(),
  ]);
  const maxMuscle = Math.max(1, ...muscles.map((m) => m.volume));

  return (
    <div className="space-y-5">
      <PageHeader title="Progress" subtitle="Your numbers over time." />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Workouts / wk" value={`${week.workouts}`} />
        <Stat label="Sets / wk" value={`${week.sets}`} />
        <Stat label="Volume / wk" value={`${Math.round(week.volume).toLocaleString()}`} />
      </div>

      {muscles.length > 0 && (
        <Card className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Muscle balance</h2>
            <span className="text-[11px] text-muted">last 7 days vs previous</span>
          </div>
          {muscles.map((m) => {
            const delta = m.prevVolume > 0 ? (m.volume - m.prevVolume) / m.prevVolume : null;
            return (
              <div key={m.muscle_group} className="space-y-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span>{m.muscle_group}</span>
                  <span className="tabular text-muted">
                    {m.sets} sets
                    {delta != null && (
                      <span className={delta >= 0 ? "ml-1.5 text-success" : "ml-1.5 text-danger"}>
                        {delta >= 0 ? "▲" : "▼"} {Math.abs(Math.round(delta * 100))}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full bg-accent/80"
                    style={{ width: `${Math.round((m.volume / maxMuscle) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </Card>
      )}

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
