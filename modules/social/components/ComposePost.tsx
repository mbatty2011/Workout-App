"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { FEATURES } from "@/config/features";
import type { Visibility } from "@/lib/database.types";
import { createPost, uploadPostPhoto } from "@/modules/social/actions";

const VISIBILITY: { value: Visibility; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "followers", label: "Followers" },
  { value: "private", label: "Only me" },
];

export function ComposePost({ workoutId }: { workoutId: string | null }) {
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("followers");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("photo", file);
    const res = await uploadPostPhoto(fd);
    setUploading(false);
    if (res.error) setError(res.error);
    else if (res.url) setPhotoUrl(res.url);
  }

  return (
    <Card className="space-y-3">
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="How did it go?"
        rows={3}
        className="w-full resize-none rounded-xl border border-border bg-bg p-3 outline-none focus:border-accent"
      />

      {photoUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="" className="aspect-square w-full rounded-xl object-cover" />
          <button
            onClick={() => setPhotoUrl(null)}
            className="absolute right-2 top-2 rounded-full bg-bg/80 px-2 py-1 text-xs"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted">
          {uploading ? "Uploading…" : "📷 Add a photo"}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
      )}

      {/* Video posts are a parked module (spec §6.3) — intentionally absent. */}
      {!FEATURES.videoPosts && (
        <p className="text-[11px] text-muted">Photos only for now.</p>
      )}

      <div className="grid grid-cols-3 gap-1">
        {VISIBILITY.map((v) => (
          <button
            key={v.value}
            onClick={() => setVisibility(v.value)}
            className={
              "rounded-lg py-2 text-xs " +
              (visibility === v.value
                ? "bg-accent/15 text-accent"
                : "border border-border text-muted")
            }
          >
            {v.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button
        size="lg"
        className="w-full"
        disabled={pending || uploading}
        onClick={() =>
          start(async () => {
            const res = await createPost({ caption, photoUrl, workoutId, visibility });
            if (res.error) setError(res.error);
            else router.push("/feed");
          })
        }
      >
        {pending ? "Posting…" : "Post"}
      </Button>
    </Card>
  );
}
