"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { cn, estimate1RM, platesPerSide, setVolume } from "@/lib/utils";
import type { Exercise, WorkoutSet } from "@/lib/database.types";
import type { ActiveExercise, PreviousSet } from "@/modules/workouts/types";
import { ExercisePicker } from "@/modules/exercises/components/ExercisePicker";
import { RestTimer } from "@/modules/workouts/components/RestTimer";
import { WorkoutWrapup } from "@/modules/workouts/components/WorkoutWrapup";
import { finishWorkout, discardWorkout, type FinishMilestone } from "@/modules/workouts/actions";

/**
 * Optimistic, offline-tolerant set logger. Every entry mutates local state
 * immediately and writes through to Supabase in the background. Set ids are
 * generated client-side so there is no temp-id reconciliation.
 */
export function Logger({
  workoutId,
  startedAt,
  dayLabel = "Workout",
  initialExercises,
  unit,
  exerciseLibrary,
}: {
  workoutId: string;
  startedAt: string;
  dayLabel?: string;
  initialExercises: ActiveExercise[];
  unit: string;
  exerciseLibrary: Exercise[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [exercises, setExercises] = useState<ActiveExercise[]>(initialExercises);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [picking, setPicking] = useState(false);
  const [restTick, setRestTick] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [wrapup, setWrapup] = useState<{
    prs: string[];
    durationSecs: number;
    milestone: FinishMilestone | null;
  } | null>(null);

  const totalSets = exercises.reduce((n, e) => n + e.sets.length, 0);
  const doneCount = done.size;
  const totalVolume = exercises.reduce(
    (v, e) => v + e.sets.reduce((s, x) => s + (x.is_warmup ? 0 : setVolume(x.weight, x.reps)), 0),
    0,
  );

  function addExercise(exercise: Exercise, previous: PreviousSet[] = []) {
    setExercises((prev) =>
      prev.some((e) => e.exercise.id === exercise.id)
        ? prev
        : [...prev, { exercise, sets: [], previous }],
    );
  }

  async function handlePick(exercise: Exercise) {
    setPicking(false);
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

  function addSet(exerciseId: string) {
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
    setExercises((prev) =>
      prev.map((e) =>
        e.exercise.id === exerciseId ? { ...e, sets: [...e.sets, newSet] } : e,
      ),
    );
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
    setDone((prev) => {
      const next = new Set(prev);
      next.delete(setId);
      return next;
    });
    void supabase.from("workout_sets").delete().eq("id", setId);
  }

  function toggleDone(set: WorkoutSet, placeholder: PreviousSet | undefined) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(set.id)) {
        next.delete(set.id);
        return next;
      }
      next.add(set.id);
      // Fill any blanks from "last time" on completion, then start rest.
      const patch: Partial<WorkoutSet> = {};
      if (set.weight == null && placeholder?.weight != null) patch.weight = placeholder.weight;
      if (set.reps == null && placeholder?.reps != null) patch.reps = placeholder.reps;
      if (Object.keys(patch).length) patchSet(set.id, patch);
      setRestTick((t) => t + 1);
      return next;
    });
  }

  async function handleFinish() {
    setFinishing(true);
    const durationSecs = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    const res = await finishWorkout(workoutId);
    setFinishing(false);
    setWrapup({ prs: res.prs ?? [], durationSecs, milestone: res.milestone ?? null });
  }

  if (wrapup) {
    return (
      <WorkoutWrapup
        workoutId={workoutId}
        prs={wrapup.prs}
        milestone={wrapup.milestone}
        stats={{ durationSecs: wrapup.durationSecs, sets: totalSets, volume: totalVolume, unit }}
        onDone={() => router.push("/")}
      />
    );
  }

  if (picking) {
    return (
      <div className="min-h-[80vh]">
        <ExercisePicker initial={exerciseLibrary} onPick={handlePick} onClose={() => setPicking(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">
      {/* Session header: day name + live duration + at-a-glance volume */}
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-accent">{dayLabel}</p>
          <Elapsed startedAt={startedAt} />
          <p className="mt-0.5 text-xs text-muted">
            {doneCount}/{totalSets || 0} sets done · {Math.round(totalVolume).toLocaleString()} {unit} volume
          </p>
        </div>
        <Button size="sm" disabled={finishing} onClick={handleFinish}>
          {finishing ? "Finishing…" : "Finish"}
        </Button>
      </header>

      <RestTimer autoStartKey={restTick} />

      {/* First-run guidance so the flow is obvious */}
      {exercises.length > 0 && doneCount === 0 && (
        <p className="rounded-xl bg-surface px-3 py-2 text-center text-xs text-muted">
          Enter weight &amp; reps, then tap the <span className="text-accent">✓</span> to log each set. Rest timer starts automatically.
        </p>
      )}

      {exercises.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="font-medium">Empty session</p>
          <p className="mt-1 text-sm text-muted">Add your first exercise to start logging.</p>
        </div>
      )}

      {exercises.map((ae) => (
        <section key={ae.exercise.id} className="rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between px-4 pt-3.5">
            <div>
              <h3 className="font-semibold leading-tight">{ae.exercise.name}</h3>
              <p className="text-xs uppercase tracking-wide text-muted">{ae.exercise.muscle_group}</p>
            </div>
            <span className="text-xs text-muted">{ae.sets.length} sets</span>
          </div>

          <div className="mt-2 grid grid-cols-[2.2rem_1fr_1fr_1fr_2.4rem] items-center gap-2 px-4 text-[10px] font-medium uppercase tracking-wide text-muted">
            <span className="text-center">Set</span>
            <span className="text-center">Last</span>
            <span className="text-center">{unit}</span>
            <span className="text-center">Reps</span>
            <span />
          </div>

          <div className="px-2 pb-2">
            {ae.sets.map((s, i) => (
              <SetRow
                key={s.id}
                set={s}
                index={i}
                previous={ae.previous[i]}
                unit={unit}
                barbell={ae.exercise.equipment === "Barbell"}
                done={done.has(s.id)}
                onPatch={(patch) => patchSet(s.id, patch)}
                onToggleWarmup={() => patchSet(s.id, { is_warmup: !s.is_warmup })}
                onToggleDone={() => toggleDone(s, ae.previous[i])}
                onRemove={() => removeSet(s.id)}
              />
            ))}
          </div>

          <button
            onClick={() => addSet(ae.exercise.id)}
            className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2.5 text-sm text-muted active:bg-bg/40"
          >
            <PlusIcon className="h-4 w-4" /> Add set
          </button>
        </section>
      ))}

      <button
        onClick={() => setPicking(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3.5 font-medium active:scale-[0.99]"
      >
        <PlusIcon className="h-5 w-5" /> Add exercise
      </button>

      <button
        onClick={() => {
          if (confirm("Discard this workout? This can't be undone.")) void discardWorkout(workoutId);
        }}
        className="w-full py-2 text-center text-sm text-danger/80 active:text-danger"
      >
        Discard workout
      </button>
    </div>
  );
}

function Elapsed({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <h1 className="tabular text-3xl font-semibold tracking-tight">
      {h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`}
    </h1>
  );
}

function SetRow({
  set,
  index,
  previous,
  unit,
  barbell,
  done,
  onPatch,
  onToggleWarmup,
  onToggleDone,
  onRemove,
}: {
  set: WorkoutSet;
  index: number;
  previous: PreviousSet | undefined;
  unit: string;
  barbell: boolean;
  done: boolean;
  onPatch: (patch: Partial<WorkoutSet>) => void;
  onToggleWarmup: () => void;
  onToggleDone: () => void;
  onRemove: () => void;
}) {
  const prevLabel =
    previous && previous.weight != null && previous.reps != null
      ? `${previous.weight}×${previous.reps}`
      : "–";
  const e1rm = estimate1RM(set.weight, set.reps);
  const plates = barbell && set.weight != null ? platesPerSide(set.weight, unit) : null;

  return (
    <div
      className={cn(
        "group grid grid-cols-[2.2rem_1fr_1fr_1fr_2.4rem] items-center gap-2 rounded-xl px-2 py-1.5 transition-colors",
        done && "bg-accent/[0.07]",
      )}
    >
      <button
        onClick={onToggleWarmup}
        className={cn(
          "tabular h-9 rounded-lg text-sm font-medium",
          set.is_warmup ? "text-accent" : "text-muted",
        )}
        title="Tap to toggle warm-up"
      >
        {set.is_warmup ? "W" : index + 1}
      </button>

      <button
        onClick={() => {
          const patch: Partial<WorkoutSet> = {};
          if (previous?.weight != null) patch.weight = previous.weight;
          if (previous?.reps != null) patch.reps = previous.reps;
          if (Object.keys(patch).length) onPatch(patch);
        }}
        className="tabular truncate text-center text-sm text-muted active:text-text"
        title="Tap to use last time"
      >
        {prevLabel}
      </button>

      <NumberInput
        value={set.weight}
        placeholder={previous?.weight ?? null}
        onCommit={(v) => onPatch({ weight: v })}
      />
      <NumberInput
        value={set.reps}
        placeholder={previous?.reps ?? null}
        onCommit={(v) => onPatch({ reps: v })}
      />

      <div className="flex items-center justify-end">
        <button
          onClick={onToggleDone}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-lg border transition-colors",
            done
              ? "border-accent bg-accent text-accent-text"
              : "border-border text-muted active:bg-bg",
          )}
          aria-label="Complete set"
        >
          <CheckIcon className="h-4 w-4" />
        </button>
      </div>

      {(e1rm && !set.is_warmup) || plates ? (
        <span className="col-span-5 px-2 text-[10px] text-muted">
          {e1rm && !set.is_warmup ? `est. 1RM ${e1rm}${unit}` : ""}
          {e1rm && !set.is_warmup && plates ? " · " : ""}
          {plates ? `🏋 ${plates}` : ""}
          <button onClick={onRemove} className="float-right text-muted/70 active:text-danger">
            remove
          </button>
        </span>
      ) : (
        <button onClick={onRemove} className="col-span-5 px-2 text-right text-[10px] text-muted/70 active:text-danger">
          remove
        </button>
      )}
    </div>
  );
}

function NumberInput({
  value,
  placeholder,
  onCommit,
}: {
  value: number | null;
  placeholder: number | null;
  onCommit: (v: number | null) => void;
}) {
  const [local, setLocal] = useState<string>(value == null ? "" : String(value));
  useEffect(() => {
    setLocal(value == null ? "" : String(value));
  }, [value]);
  return (
    <input
      inputMode="decimal"
      value={local}
      placeholder={placeholder == null ? "—" : String(placeholder)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = local === "" ? null : Number(local);
        onCommit(Number.isNaN(n as number) ? null : n);
      }}
      className="tabular h-9 w-full rounded-lg border border-transparent bg-bg text-center text-[15px] outline-none placeholder:text-muted/50 focus:border-accent"
    />
  );
}
