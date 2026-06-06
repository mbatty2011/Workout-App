"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import type { Exercise, Routine, RoutineDay } from "@/lib/database.types";
import { ExercisePicker } from "@/modules/exercises/components/ExercisePicker";
import { saveRoutine, deleteRoutine } from "@/modules/routines/actions";

/**
 * Multi-day split builder (spec §5.4). Target sets/reps per exercise per day.
 * A routine can be marked public so it feeds the AI helper + future discovery.
 */
export function RoutineBuilder({
  existing,
  exerciseLibrary,
  exerciseNames,
}: {
  existing?: Routine;
  exerciseLibrary: Exercise[];
  exerciseNames: Record<string, string>;
}) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [isPublic, setIsPublic] = useState(existing?.is_public ?? false);
  const [days, setDays] = useState<RoutineDay[]>(
    existing?.days?.length ? existing.days : [{ name: "Day 1", exercises: [] }],
  );
  const [names, setNames] = useState<Record<string, string>>(exerciseNames);
  const [pickingDay, setPickingDay] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addDay() {
    setDays((d) => [...d, { name: `Day ${d.length + 1}`, exercises: [] }]);
  }
  function renameDay(i: number, value: string) {
    setDays((d) => d.map((day, idx) => (idx === i ? { ...day, name: value } : day)));
  }
  function removeDay(i: number) {
    setDays((d) => d.filter((_, idx) => idx !== i));
  }
  function addExercise(dayIndex: number, ex: Exercise) {
    setNames((n) => ({ ...n, [ex.id]: ex.name }));
    setDays((d) =>
      d.map((day, idx) =>
        idx === dayIndex
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                { exercise_id: ex.id, target_sets: 3, target_reps: 8 },
              ],
            }
          : day,
      ),
    );
    setPickingDay(null);
  }
  function updateTarget(
    dayIndex: number,
    exIndex: number,
    field: "target_sets" | "target_reps",
    value: number,
  ) {
    setDays((d) =>
      d.map((day, idx) =>
        idx === dayIndex
          ? {
              ...day,
              exercises: day.exercises.map((e, ei) =>
                ei === exIndex ? { ...e, [field]: value } : e,
              ),
            }
          : day,
      ),
    );
  }
  function removeExercise(dayIndex: number, exIndex: number) {
    setDays((d) =>
      d.map((day, idx) =>
        idx === dayIndex
          ? { ...day, exercises: day.exercises.filter((_, ei) => ei !== exIndex) }
          : day,
      ),
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveRoutine({
        id: existing?.id,
        name,
        description,
        days,
        is_public: isPublic,
      });
      if (res.error) setError(res.error);
      else router.push("/routines");
    });
  }

  if (pickingDay !== null) {
    return (
      <div className="min-h-[70vh]">
        <ExercisePicker
          initial={exerciseLibrary}
          onPick={(ex) => addExercise(pickingDay, ex)}
          onClose={() => setPickingDay(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Split name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Push / Pull / Legs"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </div>

      {days.map((day, di) => (
        <Card key={di} className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={day.name}
              onChange={(e) => renameDay(di, e.target.value)}
              className="flex-1 bg-transparent text-base font-medium outline-none"
            />
            {days.length > 1 && (
              <button onClick={() => removeDay(di)} className="text-sm text-danger">
                Remove
              </button>
            )}
          </div>

          {day.exercises.map((ex, ei) => (
            <div key={ei} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">{names[ex.exercise_id] ?? "Exercise"}</span>
              <input
                inputMode="numeric"
                value={ex.target_sets}
                onChange={(e) => updateTarget(di, ei, "target_sets", Number(e.target.value) || 0)}
                className="tabular h-9 w-12 rounded-lg border border-border bg-bg text-center"
                aria-label="sets"
              />
              <span className="text-muted">×</span>
              <input
                inputMode="numeric"
                value={ex.target_reps}
                onChange={(e) => updateTarget(di, ei, "target_reps", Number(e.target.value) || 0)}
                className="tabular h-9 w-12 rounded-lg border border-border bg-bg text-center"
                aria-label="reps"
              />
              <button onClick={() => removeExercise(di, ei)} className="text-muted">
                ✕
              </button>
            </div>
          ))}

          <Button variant="outline" size="sm" className="w-full" onClick={() => setPickingDay(di)}>
            + Add exercise
          </Button>
        </Card>
      ))}

      <Button variant="ghost" className="w-full" onClick={addDay}>
        + Add day
      </Button>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        Make public (helps the AI helper learn what people actually use)
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button className="flex-1" size="lg" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save split"}
        </Button>
        {existing && (
          <Button
            variant="danger"
            size="lg"
            onClick={() => {
              if (confirm("Delete this split?")) void deleteRoutine(existing.id);
            }}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
