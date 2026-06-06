"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui";
import { searchUsersAction, type UserHit } from "@/modules/social/actions";

/** Find people to follow by username (spec §5.6). */
export function UserSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserHit[]>([]);
  const [, start] = useTransition();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      start(async () => setResults(await searchUsersAction(query)));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="space-y-1">
      <Input
        placeholder="Find people by username…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.map((u) => (
        <Link
          key={u.id}
          href={`/u/${u.username}`}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2"
        >
          {u.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full" />
          ) : (
            <span className="grid h-7 w-7 place-items-center rounded-full bg-bg text-xs">
              {u.username[0]?.toUpperCase()}
            </span>
          )}
          <span className="text-sm">
            {u.display_name ?? u.username}{" "}
            <span className="text-muted">@{u.username}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
