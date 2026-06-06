"use client";

import { useState } from "react";
import { toggleLike } from "@/modules/social/actions";

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  return (
    <button
      onClick={() => {
        // Optimistic.
        const next = !liked;
        setLiked(next);
        setCount((c) => c + (next ? 1 : -1));
        void toggleLike(postId, liked);
      }}
      className="flex items-center gap-1.5 text-sm active:scale-95"
    >
      <span className={liked ? "text-danger" : "text-muted"}>{liked ? "♥" : "♡"}</span>
      <span className="tabular text-muted">{count}</span>
    </button>
  );
}
