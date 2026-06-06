"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { addComment } from "@/modules/social/actions";

export function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Add a comment…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await addComment(postId, body);
            if (res.error) setError(res.error);
            else {
              setBody("");
              setError(null);
              router.refresh();
            }
          })
        }
      >
        Post
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
