import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { getExerciseHistory } from "@/modules/progress/queries";
import { ExerciseChart } from "@/modules/progress/components/ExerciseChart";
import { Card, PageHeader, Stat } from "@/components/ui";
import { getCurrentProfile } from "@/modules/auth/queries";

export default async function ExerciseProgressPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  if (!FEATURES.progress) redirect("/");
  const { exerciseId } = await params;
  const [{ name, points }, profile] = await Promise.all([
    getExerciseHistory(exerciseId),
    getCurrentProfile(),
  ]);
  const unit = profile?.unit ?? "kg";

  const bestTop = points.reduce((m, p) => Math.max(m, p.topSet), 0);
  const bestE1rm = points.reduce((m, p) => Math.max(m, p.e1rm), 0);

  return (
    <div className="space-y-5">
      <PageHeader title={name} subtitle={`${points.length} sessions logged`} />
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Best top set" value={`${bestTop || "–"}${unit}`} />
        <Stat label="Best est. 1RM" value={`${bestE1rm || "–"}${unit}`} />
      </div>
      <Card>
        <ExerciseChart points={points} />
      </Card>
    </div>
  );
}
