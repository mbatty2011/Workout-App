import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { PageHeader } from "@/components/ui";
import { AISplitWizard } from "@/modules/ai/components/AISplitWizard";

export default function AISplitPage() {
  if (!FEATURES.aiSplitHelper) redirect("/routines");
  return (
    <div>
      <PageHeader
        title="AI split helper"
        subtitle="Answer four questions. Edit anything before you save."
      />
      <AISplitWizard />
    </div>
  );
}
