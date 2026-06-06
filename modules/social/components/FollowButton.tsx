"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { followUser, unfollow } from "@/modules/social/actions";

export function FollowButton({
  targetId,
  initialFollowing,
  initialPending,
}: {
  targetId: string;
  initialFollowing: boolean;
  initialPending: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(initialPending);
  const [busy, start] = useTransition();

  const label = following ? "Following" : pending ? "Requested" : "Follow";
  const variant = following || pending ? "outline" : "primary";

  return (
    <Button
      variant={variant}
      size="sm"
      disabled={busy}
      onClick={() =>
        start(async () => {
          if (following || pending) {
            await unfollow(targetId);
            setFollowing(false);
            setPending(false);
          } else {
            await followUser(targetId);
            // We don't know here if the target is private; optimistically show
            // "Requested" — a page refresh resolves it to Following if public.
            setPending(true);
          }
        })
      }
    >
      {label}
    </Button>
  );
}
