"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Input, Pill } from "@/components/ui";
import type { Exercise } from "@/lib/database.types";
import { MUSCLE_GROUPS, EQUIPMENT } from "@/modules/exercises/constants";
import { addCustomExercise, searchExercisesAction } from "@/modules/exercises/actions";

/**
 * Searchable exercise picker used by the logger and the routine builder.
 * Search feels instant (debounced server action); custom lifts persist and
 * are immediately selectable (spec §5.2).
 */
export function ExercisePicker({
  initial,
  onPick,
  onClose,
}: {
  initial: Exercise[];
  onPick: (exercise: Exercise) => void;
  onClose?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Exercise[]>(initial);
  const [showCustom, setShowCustom] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      startTransition(async () => {
        setResults(await searchExercisesAction(query));
      });
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex gap-2">
        <Input
          autoFocus
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {results.map((ex) => (
          <button
            key={ex.id}
            onClick={() => onPick(ex)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-left active:scale-[0.99]"
          >
            <span>
              {ex.name}
              {ex.is_custom && <span className="ml-2 text-xs text-accent">custom</span>}
            </span>
            <Pill tone="muted">{ex.muscle_group}</Pill>
          </button>
        ))}
        {results.length === 0 && (
          <p className="px-1 py-4 text-sm text-muted">
            No matches. Add &ldquo;{query}&rdquo; as a custom exercise below.
          </p>
        )}
      </div>

      {showCustom ? (
        <CustomExerciseForm
          defaultName={query}
          onCreated={(ex) => {
            setShowCustom(false);
            onPick(ex);
          }}
          onCancel={() => setShowCustom(false)}
        />
      ) : (
        <Button variant="outline" onClick={() => setShowCustom(true)}>
          + Custom exercise
        </Button>
      )}
    </div>
  );
}

function CustomExerciseForm({
  defaultName,
  onCreated,
  onCancel,
}: {
  defaultName: string;
  onCreated: (ex: Exercise) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [muscle, setMuscle] = useState<string>(MUSCLE_GROUPS[0]);
  const [equipment, setEquipment] = useState<string>(EQUIPMENT[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
      <Input
        placeholder="Exercise name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          className="h-11 rounded-xl border border-border bg-bg px-2 text-sm"
          value={muscle}
          onChange={(e) => setMuscle(e.target.value)}
        >
          {MUSCLE_GROUPS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select
          className="h-11 rounded-xl border border-border bg-bg px-2 text-sm"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
        >
          {EQUIPMENT.map((eq) => (
            <option key={eq}>{eq}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await addCustomExercise(name, muscle, equipment);
              if (res.error) setError(res.error);
              else if (res.exercise) onCreated(res.exercise);
            })
          }
        >
          Save
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
