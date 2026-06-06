"use client";

import { useState, useTransition } from "react";
import { blockUser, reportTarget } from "@/modules/social/actions";

/**
 * Minimal report/block affordance. Social must ship with a report/block path
 * before opening beyond a test group (spec §7).
 */
export function ReportMenu({
  targetType,
  targetId,
  authorId,
}: {
  targetType: "post" | "comment";
  targetId: string;
  authorId: string;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [, start] = useTransition();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-1 text-muted"
        aria-label="More"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-20 w-36 overflow-hidden rounded-xl border border-border bg-surface text-sm shadow-lg">
          {done ? (
            <p className="px-3 py-2 text-muted">{done}</p>
          ) : (
            <>
              <button
                className="block w-full px-3 py-2 text-left hover:bg-bg"
                onClick={() =>
                  start(async () => {
                    await reportTarget(targetType, targetId, "Reported from feed");
                    setDone("Reported. Thanks.");
                  })
                }
              >
                Report
              </button>
              <button
                className="block w-full px-3 py-2 text-left text-danger hover:bg-bg"
                onClick={() =>
                  start(async () => {
                    await blockUser(authorId);
                    setDone("Blocked.");
                  })
                }
              >
                Block user
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
