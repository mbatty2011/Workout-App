import { createClient } from "@/lib/supabase/server";
import type {
  CommentWithAuthor,
  FeedPost,
  PublicProfile,
} from "@/modules/social/types";

type AuthorMap = Map<string, FeedPost["author"]>;

async function hydrateAuthors(ownerIds: string[]): Promise<AuthorMap> {
  const map: AuthorMap = new Map();
  if (ownerIds.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", Array.from(new Set(ownerIds)));
  for (const p of data ?? []) map.set(p.id, p);
  return map;
}

/**
 * Chronological feed (spec §5.6): own posts + posts from accepted follows.
 * No algorithmic ranking. RLS still filters anything not visible to the user.
 */
export async function getFeed(limit = 30): Promise<FeedPost[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: following } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", user.id)
    .eq("status", "accepted");
  const ownerIds = [user.id, ...(following ?? []).map((f) => f.followee_id)];

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .in("owner_id", ownerIds)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!posts || posts.length === 0) return [];

  return hydratePosts(posts, user.id);
}

export async function getPost(id: string): Promise<FeedPost | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!post) return null;
  const [hydrated] = await hydratePosts([post], user?.id ?? "");
  return hydrated ?? null;
}

async function hydratePosts(
  posts: { id: string; owner_id: string }[],
  userId: string,
): Promise<FeedPost[]> {
  const supabase = await createClient();
  const postIds = posts.map((p) => p.id);
  const authors = await hydrateAuthors(posts.map((p) => p.owner_id));

  const [{ data: likes }, { data: myLikes }, { data: comments }] = await Promise.all([
    supabase.from("post_likes").select("post_id").in("post_id", postIds),
    supabase
      .from("post_likes")
      .select("post_id")
      .in("post_id", postIds)
      .eq("user_id", userId),
    supabase.from("post_comments").select("post_id").in("post_id", postIds),
  ]);

  const likeCount = countBy(likes ?? [], "post_id");
  const commentCount = countBy(comments ?? [], "post_id");
  const likedByMe = new Set((myLikes ?? []).map((l) => l.post_id));

  return (posts as FeedPost[]).map((p) => ({
    ...p,
    author:
      authors.get(p.owner_id) ??
      ({ id: p.owner_id, username: "user", display_name: null, avatar_url: null } as FeedPost["author"]),
    like_count: likeCount.get(p.id) ?? 0,
    comment_count: commentCount.get(p.id) ?? 0,
    liked_by_me: likedByMe.has(p.id),
  }));
}

function countBy<T extends Record<K, string>, K extends string>(
  rows: T[],
  key: K,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
  return m;
}

export async function getComments(postId: string): Promise<CommentWithAuthor[]> {
  const supabase = await createClient();
  const { data: comments } = await supabase
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at");
  if (!comments || comments.length === 0) return [];
  const authors = await hydrateAuthors(comments.map((c) => c.user_id));
  return comments.map((c) => ({
    ...c,
    author:
      authors.get(c.user_id) ??
      ({ id: c.user_id, username: "user", display_name: null, avatar_url: null } as FeedPost["author"]),
  }));
}

/** A user's posts, filtered by RLS (private posts only visible to allowed viewers). */
export async function getUserPosts(ownerId: string, limit = 30): Promise<FeedPost[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!posts || posts.length === 0) return [];
  return hydratePosts(posts, user?.id ?? "");
}

export async function getFollowCounts(
  userId: string,
): Promise<{ followers: number; following: number }> {
  const supabase = await createClient();
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("followee_id", userId)
      .eq("status", "accepted"),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId)
      .eq("status", "accepted"),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}

export async function getProfileByUsername(
  username: string,
): Promise<{ profile: PublicProfile; isFollowing: boolean; isPending: boolean; isSelf: boolean } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, is_private")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) return null;

  let isFollowing = false;
  let isPending = false;
  if (user && user.id !== profile.id) {
    const { data: follow } = await supabase
      .from("follows")
      .select("status")
      .eq("follower_id", user.id)
      .eq("followee_id", profile.id)
      .maybeSingle();
    isFollowing = follow?.status === "accepted";
    isPending = follow?.status === "pending";
  }

  return {
    profile: profile as PublicProfile,
    isFollowing,
    isPending,
    isSelf: user?.id === profile.id,
  };
}

export interface FollowRequest {
  id: string;
  username: string;
}

/** Pending incoming follow requests for the current (private) user (spec §7). */
export async function getPendingFollowRequests(): Promise<FollowRequest[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("followee_id", user.id)
    .eq("status", "pending");
  const ids = (data ?? []).map((f) => f.follower_id);
  const authors = await hydrateAuthors(ids);
  return ids.map((id) => ({
    id,
    username: authors.get(id)?.username ?? "user",
  }));
}
