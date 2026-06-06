import { notFound, redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { getComments, getPost } from "@/modules/social/queries";
import { PostCard } from "@/modules/social/components/PostCard";
import { CommentForm } from "@/modules/social/components/CommentForm";
import { Card, PageHeader } from "@/components/ui";
import { relativeTime } from "@/lib/utils";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!FEATURES.socialFeed) redirect("/");
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();
  const comments = await getComments(id);

  return (
    <div className="space-y-4">
      <PageHeader title="Post" />
      <PostCard post={post} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted">
          {comments.length} comment{comments.length === 1 ? "" : "s"}
        </h2>
        <CommentForm postId={id} />
        {comments.map((c) => (
          <Card key={c.id} className="py-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">
                @{c.author.username}
              </span>
              <span className="text-xs text-muted">{relativeTime(c.created_at)} ago</span>
            </div>
            <p className="text-sm">{c.body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
