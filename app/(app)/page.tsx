import Link from "next/link";
import { FEATURES } from "@/config/features";
import { BRAND } from "@/config/brand";
import { getCurrentProfile } from "@/modules/auth/queries";
import { getActiveWorkout, listRecentWorkouts } from "@/modules/workouts/queries";
import { getWeekSummary } from "@/modules/progress/queries";
import { Card, LinkButton, PageHeader, Stat, EmptyState } from "@/components/ui";
import { relativeTime } from "@/lib/utils";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const active = FEATURES.workoutLogging ? await getActiveWorkout() : null;
  const recent = FEATURES.workoutLogging ? await listRecentWorkouts(5) : [];
  const week = FEATURES.progress ? await getWeekSummary() : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Hey ${profile?.display_name ?? profile?.username ?? ""}`}
        subtitle={BRAND.tagline}
        action={
          <Link href="/profile" className="text-2xl" aria-label="Profile">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-sm">
                {(profile?.username ?? "?")[0]?.toUpperCase()}
              </span>
            )}
          </Link>
        }
      />

      {active && (
        <Card className="border-accent/40 bg-accent/5">
          <p className="text-sm text-muted">You have a workout in progress</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-medium">Started {relativeTime(active.started_at)} ago</span>
            <LinkButton href="/workout" size="sm">
              Resume
            </LinkButton>
          </div>
        </Card>
      )}

      {FEATURES.progress && week && (
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Workouts" value={`${week.workouts}`} />
          <Stat label="Sets" value={`${week.sets}`} />
          <Stat label="Volume" value={`${Math.round(week.volume).toLocaleString()}`} />
        </div>
      )}

      {FEATURES.workoutLogging && (
        <div className="grid grid-cols-2 gap-2">
          <LinkButton href="/workout" size="lg">
            Start blank
          </LinkButton>
          {FEATURES.splitBuilder ? (
            <LinkButton href="/routines" size="lg" variant="outline">
              From a split
            </LinkButton>
          ) : (
            <LinkButton href="/progress" size="lg" variant="outline">
              Progress
            </LinkButton>
          )}
        </div>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Recent</h2>
        {recent.length === 0 ? (
          <EmptyState
            title="No workouts yet"
            subtitle="Start a blank session or build a split to get going."
          />
        ) : (
          <ul className="space-y-2">
            {recent.map((w) => (
              <li key={w.id}>
                <Link href={`/workout/${w.id}`}>
                  <Card className="flex items-center justify-between py-3">
                    <span>{new Date(w.started_at).toLocaleDateString()}</span>
                    <span className="text-sm text-muted">{relativeTime(w.started_at)} ago</span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
