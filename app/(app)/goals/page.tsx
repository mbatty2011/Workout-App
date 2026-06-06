import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { getCurrentProfile } from "@/modules/auth/queries";
import { getGoalsWithProgress, getWeightLogs } from "@/modules/goals/queries";
import { WeightChart } from "@/modules/goals/components/WeightChart";
import { WeightLogger } from "@/modules/goals/components/WeightLogger";
import { GoalEditor } from "@/modules/goals/components/GoalEditor";
import { Card, EmptyState, PageHeader } from "@/components/ui";

const GOAL_LABEL: Record<string, string> = {
  weight: "Goal weight",
  calorie: "Daily calories",
  protein: "Daily protein",
  workouts_per_week: "Workouts / week",
};

export default async function GoalsPage() {
  if (!FEATURES.weightGoals) redirect("/");
  const profile = await getCurrentProfile();
  const unit = profile?.unit ?? "kg";
  const [progress, weights] = await Promise.all([
    getGoalsWithProgress(),
    getWeightLogs(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Weight & goals" subtitle="Track bodyweight, set targets." />

      <Card className="space-y-3">
        <h2 className="text-sm font-medium text-muted">Bodyweight</h2>
        <WeightChart logs={weights} />
        <WeightLogger unit={unit} />
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted">Goals</h2>
        {progress.length === 0 ? (
          <EmptyState
            title="No goals yet"
            subtitle="Set a protein or workout target and watch it fill from your logs."
          />
        ) : (
          progress.map((p) => (
            <Card key={p.goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{GOAL_LABEL[p.goal.type]}</span>
                <span className="tabular text-sm text-muted">
                  {p.current} / {p.target} {p.unitLabel}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-bg">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${Math.round(p.ratio * 100)}%` }}
                />
              </div>
            </Card>
          ))
        )}
        <GoalEditor />
      </section>
    </div>
  );
}
