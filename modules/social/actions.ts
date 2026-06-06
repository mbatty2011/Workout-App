"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Visibility } from "@/lib/database.types";

/** Create a post (photo + text only in v1, spec §5.6). */
export async function createPost(input: {
  caption: string;
  photoUrl: string | null;
  workoutId: string | null;
  visibility: Visibility;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  if (!input.caption.trim() && !input.photoUrl) {
    return { error: "Add a caption or a photo" };
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      owner_id: user.id,
      caption: input.caption.trim() || null,
      photo_url: input.photoUrl,
      workout_id: input.workoutId,
      visibility: input.visibility,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/feed");
  return { id: data.id };
}

/** Upload a post photo to Storage; returns a public URL (spec §2 Storage). */
export async function uploadPostPhoto(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "No file" };
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isImage && !isVideo) return { error: "Images or videos only" };
  const limit = isVideo ? 50 * 1024 * 1024 : 12 * 1024 * 1024;
  if (file.size > limit) {
    return { error: isVideo ? "Video too large (max 50MB)" : "Image too large (max 12MB)" };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("post-photos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from("post-photos").getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function toggleLike(postId: string, liked: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  if (liked) {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
  }
}

export async function addComment(postId: string, body: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  if (!body.trim()) return { error: "Empty comment" };
  const { error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, user_id: user.id, body: body.trim() });
  if (error) return { error: error.message };
  revalidatePath(`/feed/${postId}`);
  return {};
}

/**
 * Follow a user. If the target is private the follow stays 'pending' until they
 * approve; public accounts are auto-accepted (spec §5.6 / §7).
 */
export async function followUser(targetId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  if (user.id === targetId) return { error: "Can't follow yourself" };

  const { data: target } = await supabase
    .from("profiles")
    .select("is_private")
    .eq("id", targetId)
    .maybeSingle();

  const status = target?.is_private ? "pending" : "accepted";
  const { error } = await supabase
    .from("follows")
    .upsert(
      { follower_id: user.id, followee_id: targetId, status },
      { onConflict: "follower_id,followee_id" },
    );
  if (error) return { error: error.message };
  revalidatePath("/feed");
  return {};
}

export async function unfollow(targetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followee_id", targetId);
  revalidatePath("/feed");
}

/** Followee approves a pending request (spec §7). */
export async function respondToFollow(followerId: string, accept: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  if (accept) {
    await supabase
      .from("follows")
      .update({ status: "accepted" })
      .eq("follower_id", followerId)
      .eq("followee_id", user.id);
  } else {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("followee_id", user.id);
  }
  revalidatePath("/feed");
}

/** Basic safety: report a post/comment/user (spec §7). */
export async function reportTarget(
  targetType: "post" | "comment" | "user",
  targetId: string,
  reason: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason,
  });
  if (error) return { error: error.message };
  return {};
}

export interface UserHit {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** Search users by username/display name (for finding people to follow). */
export async function searchUsersAction(query: string): Promise<UserHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(10);
  return (data ?? []).filter((u) => u.id !== user?.id);
}

export async function blockUser(targetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: targetId });
  // Drop any follow relationship in both directions.
  await supabase
    .from("follows")
    .delete()
    .or(`and(follower_id.eq.${user.id},followee_id.eq.${targetId}),and(follower_id.eq.${targetId},followee_id.eq.${user.id})`);
  revalidatePath("/feed");
}
