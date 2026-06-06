"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { CameraIcon } from "@/components/icons";
import type { Meal } from "@/lib/database.types";
import { MEALS } from "@/modules/food/constants";
import { logScannedFood } from "@/modules/food/actions";

interface Scanned {
  name: string;
  serving: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  confidence: "high" | "medium" | "low";
  verdict: string;
}

/**
 * Snap the nutrition label → Claude reads the macros → we check it against the
 * day's remaining plan and let the user log it.
 */
export function FoodScan() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Scanned | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("photo", file);
      const res = await fetch("/api/food/scan", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not read the label");
      setResult(data.result as Scanned);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (result) {
    return (
      <ScanResult
        result={result}
        preview={preview}
        onLogged={() => {
          reset();
          router.refresh();
        }}
        onRetake={reset}
      />
    );
  }

  return (
    <Card className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
      {preview && loading ? (
        <div className="space-y-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="mx-auto max-h-56 rounded-xl object-contain opacity-70" />
          <p className="text-sm text-muted">Reading the label…</p>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-muted active:bg-bg/40"
        >
          <CameraIcon className="h-7 w-7" />
          <span className="text-sm font-medium text-text">Snap a nutrition label</span>
          <span className="text-xs">Claude reads the macros and checks your plan</span>
        </button>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}

function ScanResult({
  result,
  preview,
  onLogged,
  onRetake,
}: {
  result: Scanned;
  preview: string | null;
  onLogged: () => void;
  onRetake: () => void;
}) {
  const [servings, setServings] = useState("1");
  const [meal, setMeal] = useState<Meal>("snack");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const s = Number(servings) || 0;

  const confColor =
    result.confidence === "high"
      ? "text-success"
      : result.confidence === "medium"
        ? "text-accent"
        : "text-muted";

  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-tight">{result.name}</p>
          <p className="text-xs text-muted">{result.serving}</p>
          <p className={`text-[11px] ${confColor}`}>{result.confidence} confidence</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <Macro label="kcal" value={result.calories} />
        <Macro label="protein" value={result.protein_g} suffix="g" />
        <Macro label="carbs" value={result.carbs_g} suffix="g" />
        <Macro label="fat" value={result.fat_g} suffix="g" />
      </div>

      {result.verdict && (
        <div className="rounded-xl border border-accent/30 bg-accent/[0.06] p-3 text-sm">
          {result.verdict}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Servings</span>
        <input
          inputMode="decimal"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          className="tabular h-9 w-16 rounded-lg border border-border bg-bg text-center"
        />
        <span className="text-xs text-muted">
          = {Math.round((result.calories ?? 0) * s)} kcal · {Math.round((result.protein_g ?? 0) * s)}g protein
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {MEALS.map((m) => (
          <button
            key={m}
            onClick={() => setMeal(m)}
            className={
              "rounded-lg py-2 text-xs capitalize " +
              (meal === m ? "bg-accent/15 text-accent" : "border border-border text-muted")
            }
          >
            {m}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await logScannedFood(
                {
                  name: result.name,
                  serving: result.serving,
                  calories: result.calories,
                  protein_g: result.protein_g,
                  carbs_g: result.carbs_g,
                  fat_g: result.fat_g,
                },
                meal,
                s,
              );
              if (res.error) setError(res.error);
              else onLogged();
            })
          }
        >
          Log it
        </Button>
        <Button variant="ghost" onClick={onRetake}>
          Retake
        </Button>
      </div>
    </Card>
  );
}

function Macro({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg py-2">
      <p className="tabular text-base font-semibold">
        {value == null ? "–" : Math.round(value)}
        {value != null && suffix}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
