import { notFound, redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { getRoutine } from "@/modules/routines/queries";
import { RoutineBuilder } from "@/modules/routines/components/RoutineBuilder";
import { loadBuilderData } from "@/modules/routines/components/loadLibrary";
import { PageHeader } from "@/components/ui";

export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!FEATURES.splitBuilder) redirect("/");
  const { id } = await params;
  const routine = await getRoutine(id);
  if (!routine) notFound();

  const existingIds = routine.days.flatMap((d) => d.exercises.map((e) => e.exercise_id));
  const { library, names } = await loadBuilderData(existingIds);

  return (
    <div>
      <PageHeader title="Edit split" />
      <RoutineBuilder existing={routine} exerciseLibrary={library} exerciseNames={names} />
    </div>
  );
}
