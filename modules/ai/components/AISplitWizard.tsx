"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Label } from "@/components/ui";
import { EQUIPMENT } from "@/modules/exercises/constants";
import { saveGeneratedSplit } from "@/modules/ai/actions";
import type {
  Experience,
  GeneratedSplit,
  Goal,
  SplitRequest,
} from "@/modules/ai/types";

const GOALS: { value: Goal; label: string }[] = [
  { value: "hypertrophy", label: "Build muscle" },
  { value: "strength", label: "Get stronger" },
  { value: "fat_loss", label: "Lose fat" },
  { value: "general_fitness", label: "General fitness" },
];
const EXPERIENCE: { value: Experience; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export function AISplitWizard() {
  const router = useRouter();
  const [goal, setGoal] = useState<Goal>("hypertrophy");
  const [daysPerWeek, setDays] = useState(4);
  const [experience, setExperience] = useState<Experience>("intermediate");
  const [equipment, setEquipment] = useState<string[]>([...EQUIPMENT]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [split, setSplit] = useState<GeneratedSplit | null>(null);
  const [saving, startSaving] = useTransition();

  function toggleEquipment(eq: string) {
    setEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq],
    );
  }

  async function generate() {
    setError(null);
    setLoading(true);
    const body: SplitRequest = { goal, daysPerWeek, experience, equipment };
    try {
      const res = await fetch("/api/ai/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSplit(data.split as GeneratedSplit);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function save() {
    if (!split) return;
    startSaving(async () => {
      const res = await saveGeneratedSplit(split);
      if (res.error) setError(res.error);
      else if (res.id) router.push(`/routines/${res.id}`);
    });
  }

  if (split) {
    return (
      <div className="space-y-4">
        <Card className="space-y-1">
          <h2 className="text-lg font-semibold">{split.name}</h2>
          <p className="text-sm text-muted">{split.description}</p>
        </Card>
        {split.days.map((day, i) => (
          <Card key={i} className="space-y-1">
            <h3 className="font-medium">{day.name}</h3>
            {day.exercises.map((e, j) => (
              <div key={j} className="flex justify-between text-sm text-muted">
                <span>{e.name}</span>
                <span className="tabular">
                  {e.target_sets} × {e.target_reps}
                </span>
              </div>
            ))}
          </Card>
        ))}
        {error && <p className="text-sm text-danger">{error}</p>}
        <p className="text-xs text-muted">
          The AI suggests — you confirm. Save it, then tweak anything you like.
        </p>
        <div className="flex gap-2">
          <Button className="flex-1" size="lg" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save split"}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setSplit(null)}>
            Redo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Label>Your goal</Label>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((g) => (
            <Choice
              key={g.value}
              active={goal === g.value}
              onClick={() => setGoal(g.value)}
            >
              {g.label}
            </Choice>
          ))}
        </div>
      </div>

      <div>
        <Label>Days per week</Label>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6].map((d) => (
            <Choice key={d} active={daysPerWeek === d} onClick={() => setDays(d)}>
              {d}
            </Choice>
          ))}
        </div>
      </div>

      <div>
        <Label>Experience</Label>
        <div className="grid grid-cols-3 gap-2">
          {EXPERIENCE.map((e) => (
            <Choice
              key={e.value}
              active={experience === e.value}
              onClick={() => setExperience(e.value)}
            >
              {e.label}
            </Choice>
          ))}
        </div>
      </div>

      <div>
        <Label>Available equipment</Label>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((eq) => (
            <Choice
              key={eq}
              active={equipment.includes(eq)}
              onClick={() => toggleEquipment(eq)}
            >
              {eq}
            </Choice>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button size="lg" className="w-full" disabled={loading} onClick={generate}>
        {loading ? "Thinking…" : "Generate split"}
      </Button>
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "h-11 flex-1 rounded-xl border px-3 text-sm " +
        (active ? "border-accent bg-accent/10 text-accent" : "border-border text-muted")
      }
    >
      {children}
    </button>
  );
}
