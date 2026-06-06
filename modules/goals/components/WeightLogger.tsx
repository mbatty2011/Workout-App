"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import type { Unit } from "@/lib/database.types";
import { logWeight } from "@/modules/goals/actions";

export function WeightLogger({ unit }: { unit: Unit }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Input
        inputMode="decimal"
        placeholder={`Today's weight (${unit})`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await logWeight(Number(value), unit);
            if (res.error) setError(res.error);
            else setValue("");
          })
        }
      >
        Log
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
