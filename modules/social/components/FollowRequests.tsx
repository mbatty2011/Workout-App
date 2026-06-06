"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { respondToFollow } from "@/modules/social/actions";
import type { FollowRequest } from "@/modules/social/queries";

/** Approve / decline incoming follow requests for a private account (spec §7). */
export function FollowRequests({ requests }: { requests: FollowRequest[] }) {
  const router = useRouter();
  const [list, setList] = useState(requests);
  const [, start] = useTransition();

  if (list.length === 0) return null;

  function respond(id: string, accept: boolean) {
    setList((l) => l.filter((r) => r.id !== id));
    start(async () => {
      await respondToFollow(id, accept);
      router.refresh();
    });
  }

  return (
    <Card className="space-y-2">
      <h2 className="text-sm font-medium text-muted">Follow requests</h2>
      {list.map((r) => (
        <div key={r.id} className="flex items-center justify-between">
          <span className="text-sm">@{r.username}</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => respond(r.id, true)}>
              Accept
            </Button>
            <Button size="sm" variant="ghost" onClick={() => respond(r.id, false)}>
              Decline
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
}
