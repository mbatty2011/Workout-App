"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";
import { estimate1RM } from "@/lib/utils";
import type { Exercise, WorkoutSet } from "@/lib/database.types";
import type { ActiveExercise, PreviousSet } from "@/modules/workouts/types";
import { ExercisePicker } from "@/modules/exercises/components/ExercisePicker";
import { RestTimer } from "@/modules/workouts/components/RestTimer";
import { finishWorkout, discardWorkout } from "@/modules/workouts/actions";

/**
 * Optimistic, offline-tolerant set logger. Every entry mutates local state
 * immediately and writes through to Supabase in the background — the keyboard
 * never waits on the network (spec §5.3). Set ids are generated client-side so
 * there is no temp-id reconciliation.
 */
export function Logger({
  workoutId,
  initialExercises,
  unit,
  exerciseLibrary,
}: {
  workoutId: string;
  initialExercises: ActiveExercise[];
  unit: string;
  exerciseLibrary: Exercise[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [exercises, setExercises] = useState<ActiveExercise[]>(initialExercises);
  const [picking, setPicking] = useState(false);
  const [restTick, setRestTick] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [prs, setPrs] = useState<string[] | null>(null);

  function addExercise(exercise: Exercise, previous: PreviousSet[] = []) {
    setExercises((prev) =>
      prev.some((e) => e.exercise.id === exercise.id)
        ? prev
        : [...prev, { exercise, sets: [], previous }],
    );
  }

  async function handlePick(exercise: Exercise) {
    setPicking(false);
    // Pull last-time numbers for this exercise so the first set pre-fills.
    const { data } = await supabase
      .from("workout_sets")
      .select("set_index, reps, weight, is_warmup, workouts!inner(owner_id, ended_at, started_at)")
      .eq("exercise_id", exercise.id)
      .not("workouts.ended_at", "is", null)
      .neq("workout_id", workoutId)
      .order("workouts(started_at)", { ascending: false })
      .limit(8);
    const previous = (data ?? []).map((d) => ({
      set_index: d.set_index,
      reps: d.reps,
      weight: d.weight,
      is_warmup: d.is_warmup,
    }));
    addExercise(exercise, previous);
  }

  async function addSet(exerciseId: string) {
    const target = exercises.find((e) => e.exercise.id === exerciseId);
    if (!target) return;
    const lastSet = target.sets[target.sets.length - 1];
    const prev = target.previous[target.sets.length];
    const setIndex = target.sets.length + 1;
    const newSet: WorkoutSet = {
      id: crypto.randomUUID(),
      workout_id: workoutId,
      exercise_id: exerciseId,
      set_index: setIndex,
      reps: lastSet?.reps ?? prev?.reps ?? null,
      weight: lastSet?.weight ?? prev?.weight ?? null,
      rpe: null,
      is_warmup: false,
      created_at: new Date().toISOString(),
    };
    // Optimistic: render now.
    setExercises((prev) =>
      prev.map((e) =>
        e.exercise.id === exerciseId ? { ...e, sets: [...e.sets, newSet] } : e,
      ),
    );
    // Write-through in the background; UI does not await.
    void supabase.from("workout_sets").insert({
      id: newSet.id,
      workout_id: workoutId,
      exercise_id: exerciseId,
      set_index: setIndex,
      reps: newSet.reps,
      weight: newSet.weight,
      is_warmup: false,
    });
  }

  function patchSet(setId: string, patch: Partial<WorkoutSet>) {
    setExercises((prev) =>
      prev.map((e) => ({
        ...e,
        sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
      })),
    );
    void supabase.from("workout_sets").update(patch).eq("id", setId);
  }

  function removeSet(setId: string) {
    setExercises((prev) =>
      prev.map((e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) })),
    );
    void supabase.from("workout_sets").delete().eq("id", setId);
  }

  async function handleFinish() {
    setFinishing(true);
    const res = await finishWorkout(workoutId);
    setFinishing(false);
    if (res.prs && res.prs.length > 0) {
      setPrs(res.prs);
    } else {
      router.push("/");
    }
  }

  if (prs) {
    return <PRCelebration prs={prs} onDone={() => router.push("/")} />;
  }

  if (picking) {
    return (
      <ExercisePicker
        initial={exerciseLibrary}
        onPick={handlePick}
        onClose={() => setPicking(false)}
      />
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <RestTimer autoStartKey={restTick} />

      {exercises.map((ae) => (
        <Card key={ae.exercise.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{ae.exercise.name}</h3>
            <span className="text-xs text-muted">{ae.exercise.muscle_group}</span>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem_2rem] items-center gap-2 px-1 text-[11px] text-muted">
            <span>Set</span>
            <span>{unit}</span>
            <span>Reps</span>
            <span>RPE</span>
            <span />
          </div>

          {ae.sets.map((s, i) => {
            const prev = ae.previous[i];
            return (
              <SetRow
                key={s.id}
                set={s}
                placeholderWeight={prev?.weight ?? null}
                placeholderReps={prev?.reps ?? null}
                onChange={(patch) => patchSet(s.id, patch)}
                onLogged={() => setRestTick((t) => t + 1)}
                onRemove={() => removeSet(s.id)}
              />
            );
          })}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => addSet(ae.exercise.id)}
          >
            + Add set
          </Button>
        </Card>
      ))}

      <Button variant="outline" className="w-full" onClick={() => setPicking(true)}>
        + Add exercise
      </Button>

      <div className="flex gap-2">
        <Button className="flex-1" size="lg" disabled={finishing} onClick={handleFinish}>
          {finishing ? "Finishing…" : "Finish workout"}
        </Button>
        <Button
          variant="danger"
          size="lg"
          onClick={() => {
            if (confirm("Discard this workout?")) void discardWorkout(workoutId);
          }}
        >
          Discard
        </Button>
      </div>
    </div>
  );
}

function SetRow({
  set,
  placeholderWeight,
  placeholderReps,
  onChange,
  onLogged,
  onRemove,
}: {
  set: WorkoutSet;
  placeholderWeight: number | null;
  placeholderReps: number | null;
  onChange: (patch: Partial<WorkoutSet>) => void;
  onLogged: () => void;
  onRemove: () => void;
}) {
  const e1rm = estimate1RM(set.weight, set.reps);
  return (
    <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem_2rem] items-center gap-2">
      <button
        onClick={() => onChange({ is_warmup: !set.is_warmup })}
        className={
          "h-9 rounded-lg text-xs " +
          (set.is_warmup ? "bg-accent/15 text-accent" : "bg-surface text-muted")
        }
        title="Toggle warm-up"
      >
        {set.is_warmup ? "W" : set.set_index}
      </button>
      <NumberInput
        value={set.weight}
        placeholder={placeholderWeight}
        onCommit={(v) => {
          onChange({ weight: v });
          if (v != null) onLogged();
        }}
      />
      <NumberInput
        value={set.reps}
        placeholder={placeholderReps}
        onCommit={(v) => {
          onChange({ reps: v });
          if (v != null) onLogged();
        }}
      />
      <NumberInput
        value={set.rpe}
        placeholder={null}
        step="0.5"
        onCommit={(v) => onChange({ rpe: v })}
      />
      <button onClick={onRemove} className="text-muted active:scale-90" aria-label="Remove set">
        ✕
      </button>
      {e1rm && (
        <span className="col-span-5 px-1 text-[10px] text-muted">
          est. 1RM {e1rm}
        </span>
      )}
    </div>
  );
}

function NumberInput({
  value,
  placeholder,
  step = "0.5",
  onCommit,
}: {
  value: number | null;
  placeholder: number | null;
  step?: string;
  onCommit: (v: number | null) => void;
}) {
  const [local, setLocal] = useState<string>(value == null ? "" : String(value));
  return (
    <input
      inputMode="decimal"
      step={step}
      value={local}
      placeholder={placeholder == null ? "" : String(placeholder)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = local === "" ? null : Number(local);
        onCommit(Number.isNaN(n as number) ? null : n);
      }}
      className="tabular h-9 w-full rounded-lg border border-border bg-bg px-2 text-center outline-none focus:border-accent"
    />
  );
}

function PRCelebration({ prs, onDone }: { prs: string[]; onDone: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="animate-pr text-6xl">🏆</div>
      <h2 className="text-xl font-semibold">New PR{prs.length > 1 ? "s" : ""}!</h2>
      <ul className="space-y-1 text-accent">
        {prs.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <Button size="lg" onClick={onDone}>
        Nice. Done
      </Button>
    </div>
  );
}
