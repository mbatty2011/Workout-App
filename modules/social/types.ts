import type { Post, PostComment, Profile } from "@/lib/database.types";

export interface FeedPost extends Post {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
}

export interface CommentWithAuthor extends PostComment {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
}

export type PublicProfile = Pick<
  Profile,
  "id" | "username" | "display_name" | "avatar_url" | "bio" | "is_private"
>;
