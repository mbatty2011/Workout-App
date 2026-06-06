import { notFound, redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import {
  getProfileByUsername,
  getUserPosts,
  getFollowCounts,
} from "@/modules/social/queries";
import { PostCard } from "@/modules/social/components/PostCard";
import { FollowButton } from "@/modules/social/components/FollowButton";
import { Card, EmptyState, Stat } from "@/components/ui";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  if (!FEATURES.socialFeed) redirect("/");
  const { username } = await params;
  const result = await getProfileByUsername(username);
  if (!result) notFound();
  const { profile, isFollowing, isPending, isSelf } = result;

  const counts = await getFollowCounts(profile.id);
  // Private accounts: only show posts to self or accepted followers (spec §7).
  const canSeePosts = !profile.is_private || isSelf || isFollowing;
  const posts = canSeePosts ? await getUserPosts(profile.id) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-surface text-2xl">
            {profile.username[0]?.toUpperCase()}
          </span>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{profile.display_name ?? profile.username}</h1>
          <p className="text-sm text-muted">@{profile.username}</p>
        </div>
        {!isSelf && (
          <FollowButton
            targetId={profile.id}
            initialFollowing={isFollowing}
            initialPending={isPending}
          />
        )}
      </div>

      {profile.bio && <p className="text-sm">{profile.bio}</p>}

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Posts" value={`${posts.length}`} />
        <Stat label="Followers" value={`${counts.followers}`} />
        <Stat label="Following" value={`${counts.following}`} />
      </div>

      {!canSeePosts ? (
        <Card className="text-center text-sm text-muted">
          This account is private. Follow to see their posts.
        </Card>
      ) : posts.length === 0 ? (
        <EmptyState title="No posts yet" />
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
