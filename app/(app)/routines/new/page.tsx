import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { PageHeader } from "@/components/ui";
import { RoutineBuilder } from "@/modules/routines/components/RoutineBuilder";
import { loadBuilderData } from "@/modules/routines/components/loadLibrary";

export default async function NewRoutinePage() {
  if (!FEATURES.splitBuilder) redirect("/");
  const { library } = await loadBuilderData();
  return (
    <div>
      <PageHeader title="New split" />
      <RoutineBuilder exerciseLibrary={library} exerciseNames={{}} />
    </div>
  );
}
