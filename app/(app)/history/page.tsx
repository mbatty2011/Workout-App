import Link from "next/link";
import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { relativeTime } from "@/lib/utils";

/** Full training history, grouped by month. */
export default async function HistoryPage() {
  if (!FEATURES.workoutLogging) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, started_at, ended_at, note")
    .eq("owner_id", user?.id ?? "")
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(200);

  // Group by "Month Year".
  const groups: { label: string; items: NonNullable<typeof workouts> }[] = [];
  for (const w of workouts ?? []) {
    const label = new Date(w.started_at).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(w);
    else groups.push({ label, items: [w] });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="History" subtitle={`${workouts?.length ?? 0} workouts logged`} />

      {groups.length === 0 ? (
        <EmptyState
          title="No workouts yet"
          subtitle="Finish your first session and it'll show up here."
        />
      ) : (
        groups.map((g) => (
          <section key={g.label}>
            <h2 className="mb-2 text-sm font-medium text-muted">{g.label}</h2>
            <ul className="space-y-2">
              {g.items.map((w) => (
                <li key={w.id}>
                  <Link href={`/workout/${w.id}`}>
                    <Card className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="text-sm">
                          {new Date(w.started_at).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        {w.note && <p className="truncate text-xs text-muted">{w.note}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-muted">
                        {relativeTime(w.started_at)} ago
                      </span>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
