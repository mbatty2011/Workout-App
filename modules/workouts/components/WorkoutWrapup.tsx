"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { MediaView } from "@/components/MediaView";
import { CameraIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/lib/database.types";
import { saveWorkoutWrapup, uploadWorkoutPhoto } from "@/modules/workouts/actions";

interface Stats {
  durationSecs: number;
  sets: number;
  volume: number;
  unit: string;
}

const VIS: { value: Visibility; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "followers", label: "Followers" },
  { value: "private", label: "Only me" },
];

/** Shown right after finishing: celebrate PRs, add a note + photo, optionally share. */
export function WorkoutWrapup({
  workoutId,
  prs,
  stats,
  onDone,
}: {
  workoutId: string;
  prs: string[];
  stats: Stats;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [share, setShare] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("followers");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const mins = Math.round(stats.durationSecs / 60);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("photo", file);
    const res = await uploadWorkoutPhoto(fd);
    setUploading(false);
    if (res.error) setError(res.error);
    else if (res.url) setPhotoUrl(res.url);
  }

  function save() {
    start(async () => {
      const res = await saveWorkoutWrapup(workoutId, { note, photoUrl, share, visibility });
      if (res.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="pt-2 text-center">
        {prs.length > 0 && <div className="animate-pr text-5xl">🏆</div>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Workout complete</h1>
        <p className="mt-1 text-sm text-muted">
          {mins} min · {stats.sets} sets · {Math.round(stats.volume).toLocaleString()} {stats.unit} volume
        </p>
        {prs.length > 0 && (
          <p className="mt-2 text-sm text-accent">
            New PR{prs.length > 1 ? "s" : ""}: {prs.join(", ")}
          </p>
        )}
      </div>

      <Card className="space-y-3">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How did it go? Add a note…"
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-bg p-3 outline-none focus:border-accent"
        />

        <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={onFile} />
        {photoUrl ? (
          <div className="relative">
            <MediaView url={photoUrl} controls className="aspect-square w-full rounded-xl object-cover" />
            <button
              onClick={() => setPhotoUrl(null)}
              className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted active:bg-bg"
          >
            <CameraIcon className="h-5 w-5" /> {uploading ? "Uploading…" : "Add a photo or video"}
          </button>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={share}
            onChange={(e) => setShare(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Share to feed
        </label>
        {share && (
          <div className="grid grid-cols-3 gap-1">
            {VIS.map((v) => (
              <button
                key={v.value}
                onClick={() => setVisibility(v.value)}
                className={cn(
                  "rounded-lg py-2 text-xs",
                  visibility === v.value ? "bg-accent/15 text-accent" : "border border-border text-muted",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button className="flex-1" size="lg" disabled={pending || uploading} onClick={save}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" size="lg" onClick={onDone}>
          Skip
        </Button>
      </div>
    </div>
  );
}
