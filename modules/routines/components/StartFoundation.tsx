"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStarterRoutine } from "@/modules/routines/actions";

/**
 * The Day-One button: creates the "Foundation" beginner split (if needed) and
 * drops the user straight into day one — two taps from signup to first set.
 */
export function StartFoundation({ label = "Start your first workout" }: { label?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="w-full">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await createStarterRoutine();
            if (res.error || !res.id) setError(res.error ?? "Something went wrong");
            else router.push(`/workout?routine=${res.id}&day=0`);
          })
        }
        className="h-14 w-full rounded-2xl bg-accent text-base font-semibold text-accent-text active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Setting you up…" : label}
      </button>
      <p className="mt-2 text-center text-xs text-muted">
        6 simple movements, about 30 minutes. We&apos;ll guide every set.
      </p>
      {error && <p className="mt-1 text-center text-xs text-danger">{error}</p>}
    </div>
  );
}
