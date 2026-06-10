"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { CameraIcon } from "@/components/icons";
import type { Profile, Unit } from "@/lib/database.types";
import { signOut, updateProfileSettings, uploadAvatar } from "@/modules/auth/actions";

export function ProfileSettings({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [unit, setUnit] = useState<Unit>(profile.unit);
  const [isPrivate, setIsPrivate] = useState(profile.is_private);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("avatar", file);
    const res = await uploadAvatar(fd);
    setUploading(false);
    if (res.error) setError(res.error);
    else if (res.url) {
      setAvatarUrl(res.url);
      router.refresh();
    }
  }

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
      <div className="flex items-center gap-3">
        <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
        <button
          onClick={() => avatarRef.current?.click()}
          className="relative shrink-0"
          aria-label="Change avatar"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full bg-bg text-xl">
              {profile.username[0]?.toUpperCase()}
            </span>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-text">
            <CameraIcon className="h-3.5 w-3.5" />
          </span>
        </button>
        <p className="text-xs text-muted">
          {uploading ? "Uploading…" : "Tap the photo to change your avatar."}
        </p>
      </div>

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
