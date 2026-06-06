import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { getFeed, getPendingFollowRequests } from "@/modules/social/queries";
import { PostCard } from "@/modules/social/components/PostCard";
import { FollowRequests } from "@/modules/social/components/FollowRequests";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { UserSearch } from "@/modules/social/components/UserSearch";

export default async function FeedPage() {
  if (!FEATURES.socialFeed) redirect("/");
  const [posts, requests] = await Promise.all([
    getFeed(),
    getPendingFollowRequests(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Feed"
        subtitle="Calm and chronological."
        action={
          <LinkButton href="/feed/new" size="sm">
            Post
          </LinkButton>
        }
      />

      <UserSearch />
      <FollowRequests requests={requests} />

      {posts.length === 0 ? (
        <EmptyState
          title="Quiet in here"
          subtitle="Follow a friend or share your last session to get the feed going."
          action={
            <LinkButton href="/feed/new" size="sm">
              Share a workout
            </LinkButton>
          }
        />
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
