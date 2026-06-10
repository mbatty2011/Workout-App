"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { completeOnboarding } from "@/modules/auth/actions";

export function OnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [unit, setUnit] = useState<"kg" | "lb">("kg");

  async function onSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    const res = await completeOnboarding(formData);
    setPending(false);
    if (res?.error) setError(res.error);
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div>
        <Label>Username</Label>
        <Input
          name="username"
          placeholder="ironmike"
          autoCapitalize="none"
          autoComplete="off"
          required
        />
      </div>

      <div>
        <Label>Units</Label>
        <input type="hidden" name="unit" value={unit} />
        <div className="grid grid-cols-2 gap-2">
          {(["kg", "lb"] as const).map((u) => (
            <button
              type="button"
              key={u}
              onClick={() => setUnit(u)}
              className={
                "h-11 rounded-xl border text-sm " +
                (unit === u
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted")
              }
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>What are you training for?</Label>
        <Input
          name="why"
          placeholder="e.g. to feel strong again, my kids, summer"
          maxLength={120}
          autoComplete="off"
        />
        <p className="mt-1 text-xs text-muted">
          We&apos;ll remind you on the days it matters. You can change it later.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="is_minor" className="h-4 w-4 accent-accent" />
        I&apos;m under 18 (account will be private by default)
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "…" : "Start"}
      </Button>
    </form>
  );
}
