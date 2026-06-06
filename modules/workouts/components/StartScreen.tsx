"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { DumbbellIcon, PlusIcon } from "@/components/icons";
import { startWorkout } from "@/modules/workouts/actions";

interface RoutineLite {
  id: string;
  name: string;
  days: { name: string }[];
}

/**
 * Shown when there is no active session. A workout is only created on an
 * explicit tap here (or by picking a routine day) — never just by visiting
 * the tab — so finishing a workout actually ends it.
 */
export function StartScreen({ routines }: { routines: RoutineLite[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function begin(routineId?: string, dayIndex?: number) {
    start(async () => {
      await startWorkout(routineId, dayIndex);
      router.refresh(); // page re-renders, now finds the active session
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-surface text-accent">
          <DumbbellIcon className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ready to lift?</h1>
          <p className="mt-1 text-sm text-muted">Start fresh, or jump into a day from a split.</p>
        </div>
        <Button size="lg" className="w-full" disabled={pending} onClick={() => begin()}>
          <PlusIcon className="h-5 w-5" /> {pending ? "Starting…" : "Start empty workout"}
        </Button>
      </div>

      {routines.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted">From a split</h2>
          {routines.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-surface p-4">
              <p className="mb-2 font-medium">{r.name}</p>
              <div className="flex flex-wrap gap-2">
                {r.days.map((d, i) => (
                  <button
                    key={i}
                    disabled={pending}
                    onClick={() => begin(r.id, i)}
                    className="rounded-xl border border-border px-3 py-2 text-sm text-muted active:bg-bg disabled:opacity-50"
                  >
                    ▶ {d.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
