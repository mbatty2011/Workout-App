import Link from "next/link";
import { Card, Pill } from "@/components/ui";
import { MediaView } from "@/components/MediaView";
import { relativeTime } from "@/lib/utils";
import type { FeedPost } from "@/modules/social/types";
import { LikeButton } from "@/modules/social/components/LikeButton";
import { ReportMenu } from "@/modules/social/components/ReportMenu";

export function PostCard({ post }: { post: FeedPost }) {
  const name = post.author.display_name ?? post.author.username;
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <Link href={`/u/${post.author.username}`} className="flex items-center gap-2">
          {post.author.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.author.avatar_url} alt="" className="h-8 w-8 rounded-full" />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-bg text-sm">
              {name[0]?.toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-sm font-medium leading-tight">{name}</p>
            <p className="text-xs text-muted">{relativeTime(post.created_at)} ago</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {post.visibility !== "public" && <Pill tone="muted">{post.visibility}</Pill>}
          <ReportMenu targetType="post" targetId={post.id} authorId={post.author.id} />
        </div>
      </div>

      {post.photo_url && (
        <MediaView url={post.photo_url} controls className="aspect-square w-full rounded-xl object-cover" />
      )}

      {post.caption && <p className="text-sm">{post.caption}</p>}

      <div className="flex items-center gap-4">
        <LikeButton
          postId={post.id}
          initialLiked={post.liked_by_me}
          initialCount={post.like_count}
        />
        <Link href={`/feed/${post.id}`} className="text-sm text-muted">
          💬 {post.comment_count}
        </Link>
        {post.workout_id && (
          <Link href={`/workout/${post.workout_id}`} className="text-sm text-accent">
            View workout
          </Link>
        )}
      </div>
    </Card>
  );
}
