import Link from "next/link";
import { FEATURES } from "@/config/features";
import { getCurrentProfile } from "@/modules/auth/queries";
import { getActiveWorkout, listRecentWorkouts } from "@/modules/workouts/queries";
import {
  getWeekSummary,
  getTrainingStats,
  listLoggedExercises,
} from "@/modules/progress/queries";
import { listRoutines } from "@/modules/routines/queries";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { FlameIcon, TrendIcon, DumbbellIcon } from "@/components/icons";
import { CoachCard } from "@/modules/home/components/CoachCard";
import { relativeTime } from "@/lib/utils";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const unit = profile?.unit ?? "kg";

  const [active, recent, week, stats, routines, exercises] = await Promise.all([
    FEATURES.workoutLogging ? getActiveWorkout() : null,
    FEATURES.workoutLogging ? listRecentWorkouts(4) : [],
    FEATURES.progress ? getWeekSummary() : null,
    FEATURES.progress ? getTrainingStats() : null,
    FEATURES.splitBuilder ? listRoutines() : [],
    FEATURES.progress ? listLoggedExercises() : [],
  ]);

  const latestRoutine = routines[0];
  const bestLifts = exercises
    .filter((e) => e.best_e1rm != null)
    .sort((a, b) => (b.best_e1rm ?? 0) - (a.best_e1rm ?? 0))
    .slice(0, 3);

  const firstName = (profile?.display_name ?? profile?.username ?? "").split(" ")[0];

  return (
    <div className="space-y-4">
      <PageHeader
        title={greeting(firstName)}
        subtitle={subline(stats?.workoutsThisWeek ?? 0)}
        action={
          <Link href="/profile" aria-label="Profile">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-sm font-medium">
                {(profile?.username ?? "?")[0]?.toUpperCase()}
              </span>
            )}
          </Link>
        }
      />

      {/* Resume banner — always first when a session is open */}
      {active && (
        <Link href="/workout" className="block">
          <Card className="flex items-center justify-between border-accent/40 bg-accent/[0.07]">
            <div>
              <p className="font-medium">Workout in progress</p>
              <p className="text-xs text-muted">Started {relativeTime(active.started_at)} ago</p>
            </div>
            <span className="rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-accent-text">
              Resume
            </span>
          </Card>
        </Link>
      )}

      {/* Streak + week stats */}
      {FEATURES.progress && stats && week && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="flex flex-col items-center gap-0.5 py-3">
            <FlameIcon className="h-5 w-5 text-accent" />
            <p className="tabular text-xl font-semibold leading-tight">{stats.weekStreak}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted">week streak</p>
          </Card>
          <Card className="flex flex-col items-center gap-0.5 py-3">
            <DumbbellIcon className="h-5 w-5 text-muted" />
            <p className="tabular text-xl font-semibold leading-tight">{stats.workoutsThisWeek}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted">this week</p>
          </Card>
          <Card className="flex flex-col items-center gap-0.5 py-3">
            <TrendIcon className="h-5 w-5 text-muted" />
            <p className="tabular text-xl font-semibold leading-tight">
              {compactNumber(week.volume)}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted">{unit} volume</p>
          </Card>
        </div>
      )}

      {/* AI coach */}
      {FEATURES.aiSplitHelper && <CoachCard />}

      {/* Today's plan: jump straight into a day of the latest split */}
      {!active && FEATURES.splitBuilder && latestRoutine && (
        <Card className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{latestRoutine.name}</h2>
            <Link href={`/routines/${latestRoutine.id}`} className="text-xs text-muted">
              Edit
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {latestRoutine.days.map((d, i) => (
              <Link
                key={i}
                href={`/workout?routine=${latestRoutine.id}&day=${i}`}
                className="rounded-xl border border-border px-3.5 py-2 text-sm active:bg-surface"
              >
                ▶ {d.name}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Quick actions */}
      {!active && (
        <div className="grid grid-cols-2 gap-2">
          {FEATURES.workoutLogging && (
            <LinkButton href="/workout" size="lg">
              Start workout
            </LinkButton>
          )}
          {FEATURES.foodTracker && (
            <LinkButton href="/food" size="lg" variant="outline">
              Log food
            </LinkButton>
          )}
        </div>
      )}

      {/* Best lifts */}
      {FEATURES.progress && bestLifts.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">Best lifts</h2>
            <Link href="/progress" className="text-xs text-accent">
              All progress
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {bestLifts.map((e) => (
              <Link key={e.exercise_id} href={`/progress/${e.exercise_id}`}>
                <Card className="h-full py-2.5 text-center">
                  <p className="tabular text-lg font-semibold">
                    {Math.round(e.best_e1rm ?? 0)}
                    <span className="text-xs text-muted">{unit}</span>
                  </p>
                  <p className="truncate text-[11px] text-muted">{e.name}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent sessions */}
      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Recent</h2>
        {recent.length === 0 ? (
          <Card className="text-center text-sm text-muted">
            No workouts yet — your history will live here.
          </Card>
        ) : (
          <ul className="space-y-2">
            {recent.map((w) => (
              <li key={w.id}>
                <Link href={`/workout/${w.id}`}>
                  <Card className="flex items-center justify-between py-3">
                    <span className="text-sm">
                      {new Date(w.started_at).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-muted">{relativeTime(w.started_at)} ago</span>
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

function greeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 5 ? "Up late" : h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
  return name ? `${part}, ${name}` : part;
}

function subline(thisWeek: number): string {
  if (thisWeek === 0) return "Fresh week. First one sets the tone.";
  if (thisWeek === 1) return "1 down this week. Keep it rolling.";
  return `${thisWeek} sessions this week. Strong pace.`;
}

function compactNumber(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}
