"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { cn, relativeTime } from "@/lib/utils";
import {
  HeartIcon,
  CommentIcon,
  PlusIcon,
  FeedIcon,
} from "@/components/icons";
import { MediaView } from "@/components/MediaView";
import type { FeedPost } from "@/modules/social/types";
import { toggleLike } from "@/modules/social/actions";

/**
 * Instagram-Reels-style feed. Two native scroll-snap axes:
 *   • swipe up / down  → move between posts within a feed
 *   • swipe left/right → switch between "Following" and "Explore"
 * Built on CSS scroll-snap so the gestures feel native with no JS gesture lib.
 */
export function ReelsFeed({
  following,
  explore,
}: {
  following: FeedPost[];
  explore: FeedPost[];
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);

  function onScroll() {
    const el = outerRef.current;
    if (!el) return;
    setTab(Math.round(el.scrollLeft / el.clientWidth));
  }
  function goTab(i: number) {
    const el = outerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  const panels: { label: string; posts: FeedPost[]; empty: string }[] = [
    { label: "Following", posts: following, empty: "Follow people to fill this feed." },
    { label: "Explore", posts: explore, empty: "No public posts yet. Be the first." },
  ];

  return (
    <div className="relative -mx-4 -mb-6 -mt-6 h-[calc(100svh-3.75rem)] overflow-hidden bg-black">
      {/* Top overlay: feed switch + post */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div className="pointer-events-auto flex gap-4">
          {panels.map((p, i) => (
            <button
              key={p.label}
              onClick={() => goTab(i)}
              className={cn(
                "text-sm font-semibold drop-shadow transition-opacity",
                tab === i ? "text-white" : "text-white/50",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="pointer-events-auto flex items-center gap-3 text-white drop-shadow">
          <Link href="/feed/people" aria-label="Find people">
            <FeedIcon className="h-6 w-6" />
          </Link>
          <Link href="/feed/new" aria-label="New post">
            <PlusIcon className="h-6 w-6" />
          </Link>
        </div>
      </div>

      {/* Horizontal snap between the two feeds */}
      <div
        ref={outerRef}
        onScroll={onScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden no-scrollbar"
        style={{ overscrollBehavior: "contain" }}
      >
        {panels.map((panel) => (
          <div
            key={panel.label}
            className="h-full w-full shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden no-scrollbar"
            style={{
              scrollSnapType: "y mandatory",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {panel.posts.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-white/70">
                <p className="text-sm">{panel.empty}</p>
                <Link
                  href="/feed/new"
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white"
                >
                  Share a workout
                </Link>
              </div>
            ) : (
              panel.posts.map((post) => <Reel key={post.id} post={post} />)
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Reel({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [count, setCount] = useState(post.like_count);
  const lastTap = useRef(0);

  function like() {
    if (liked) return;
    setLiked(true);
    setCount((c) => c + 1);
    void toggleLike(post.id, false);
  }
  function toggle() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    void toggleLike(post.id, liked);
  }
  function onDoubleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) like();
    lastTap.current = now;
  }

  const name = post.author.display_name ?? post.author.username;

  return (
    <article
      onClick={onDoubleTap}
      className="relative flex h-full w-full snap-start snap-always items-center justify-center overflow-hidden bg-neutral-950"
    >
      {post.photo_url ? (
        <>
          <MediaView url={post.photo_url} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-neutral-900 to-black p-8">
          <p className="text-xl font-medium leading-snug text-white">{post.caption}</p>
        </div>
      )}

      {/* Right action rail */}
      <div className="absolute bottom-28 right-3 z-10 flex flex-col items-center gap-5 text-white">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className="flex flex-col items-center gap-1 active:scale-90"
        >
          <HeartIcon filled={liked} className={cn("h-8 w-8", liked && "text-rose-500")} />
          <span className="tabular text-xs">{count}</span>
        </button>
        <Link
          href={`/feed/${post.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-1 active:scale-90"
        >
          <CommentIcon className="h-8 w-8" />
          <span className="tabular text-xs">{post.comment_count}</span>
        </Link>
      </div>

      {/* Bottom-left author + caption */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 pb-6 text-white">
        <Link
          href={`/u/${post.author.username}`}
          onClick={(e) => e.stopPropagation()}
          className="mb-2 inline-flex items-center gap-2"
        >
          {post.author.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.author.avatar_url} alt="" className="h-8 w-8 rounded-full ring-1 ring-white/40" />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-sm">
              {name[0]?.toUpperCase()}
            </span>
          )}
          <span className="text-sm font-semibold">{name}</span>
          <span className="text-xs text-white/60">· {relativeTime(post.created_at)}</span>
        </Link>
        {post.photo_url && post.caption && (
          <p className="max-w-[80%] text-sm text-white/90">{post.caption}</p>
        )}
        {post.workout_id && (
          <Link
            href={`/workout/${post.workout_id}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs"
          >
            View workout
          </Link>
        )}
      </div>
    </article>
  );
}
