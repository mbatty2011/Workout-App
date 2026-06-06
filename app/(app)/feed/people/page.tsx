import Link from "next/link";
import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { getPendingFollowRequests } from "@/modules/social/queries";
import { UserSearch } from "@/modules/social/components/UserSearch";
import { FollowRequests } from "@/modules/social/components/FollowRequests";
import { PageHeader, LinkButton } from "@/components/ui";

export default async function PeoplePage() {
  if (!FEATURES.socialFeed) redirect("/");
  const requests = await getPendingFollowRequests();

  return (
    <div className="space-y-4">
      <PageHeader
        title="People"
        subtitle="Find friends and manage requests."
        action={
          <Link href="/feed" className="text-sm text-accent">
            Back to feed
          </Link>
        }
      />
      <UserSearch />
      <FollowRequests requests={requests} />
      <LinkButton href="/feed/new" variant="outline" className="w-full">
        Share a workout
      </LinkButton>
    </div>
  );
}
