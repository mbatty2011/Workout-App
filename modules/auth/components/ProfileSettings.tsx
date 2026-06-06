"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import type { Profile, Unit } from "@/lib/database.types";
import { signOut, updateProfileSettings } from "@/modules/auth/actions";

export function ProfileSettings({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [unit, setUnit] = useState<Unit>(profile.unit);
  const [isPrivate, setIsPrivate] = useState(profile.is_private);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setOpen(true)}>
          Edit profile
        </Button>
        <Button variant="ghost" onClick={() => start(() => void signOut())}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <Card className="space-y-3">
      <div>
        <Label>Display name</Label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div>
        <Label>Bio</Label>
        <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Optional" />
      </div>
      <div>
        <Label>Units</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["kg", "lb"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={
                "h-11 rounded-xl border text-sm " +
                (unit === u ? "border-accent bg-accent/10 text-accent" : "border-border text-muted")
              }
            >
              {u}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        Private account (approve followers)
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await updateProfileSettings({
                display_name: displayName,
                bio,
                unit,
                is_private: isPrivate,
              });
              if (res.error) setError(res.error);
              else {
                setOpen(false);
                router.refresh();
              }
            })
          }
        >
          Save
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
