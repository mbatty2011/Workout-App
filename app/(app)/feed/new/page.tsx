import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { PageHeader } from "@/components/ui";
import { ComposePost } from "@/modules/social/components/ComposePost";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ workout?: string }>;
}) {
  if (!FEATURES.socialFeed) redirect("/");
  const { workout } = await searchParams;
  return (
    <div>
      <PageHeader title="New post" />
      <ComposePost workoutId={workout ?? null} />
    </div>
  );
}
