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
import { getWeeklyTarget } from "@/modules/goals/queries";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { FlameIcon } from "@/components/icons";
import { CoachCard } from "@/modules/home/components/CoachCard";
import { StartFoundation } from "@/modules/routines/components/StartFoundation";
import { dayKey, relativeTime } from "@/lib/utils";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const unit = profile?.unit ?? "kg";
  const why = (profile as { why?: string | null } | null)?.why ?? null;

  const [active, recent, week, stats, routines, exercises, weeklyTarget] = await Promise.all([
    FEATURES.workoutLogging ? getActiveWorkout() : null,
    FEATURES.workoutLogging ? listRecentWorkouts(15) : [],
    FEATURES.progress ? getWeekSummary() : null,
    FEATURES.progress ? getTrainingStats() : null,
    FEATURES.splitBuilder ? listRoutines() : [],
    FEATURES.progress ? listLoggedExercises() : [],
    FEATURES.weightGoals ? getWeeklyTarget() : null,
  ]);

  const firstName = (profile?.display_name ?? profile?.username ?? "").split(" ")[0];
  const isNew = (stats?.totalWorkouts ?? 0) === 0 && !active;

  /* ------------------------------------------------------------------ */
  /* Day One — a brand-new user sees exactly one thing to do.            */
  /* ------------------------------------------------------------------ */
  if (isNew) {
    return (
      <div className="flex min-h-[70vh] flex-col justify-center space-y-8">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-accent">Day one</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">
            The only workout that
            <br />
            matters is the first one.
          </h1>
          {why && (
            <p className="mx-auto mt-3 max-w-xs text-sm italic text-muted">
              You&apos;re here for: &ldquo;{why}&rdquo;
            </p>
          )}
        </div>

        <StartFoundation />

        <div className="text-center text-sm text-muted">
          Already train?{" "}
          <Link href="/routines" className="text-accent">
            Build or generate your own split
          </Link>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Returning user — one clear "Today", then momentum, then the rest.   */
  /* ------------------------------------------------------------------ */
  const today = dayKey();
  const trainedToday = recent.some((w) => dayKey(new Date(w.started_at)) === today);
  const latestRoutine = routines[0];
  const daysSinceLast = recent[0]
    ? Math.floor((Date.now() - new Date(recent[0].started_at).getTime()) / 86400000)
    : null;
  const lapsed = !trainedToday && daysSinceLast != null && daysSinceLast >= 4;

  // Suggest the next day of the latest split (the day after the last one done).
  let nextDayIndex = 0;
  if (latestRoutine && recent[0]?.routine_id === latestRoutine.id && recent[0].routine_day_index != null) {
    nextDayIndex = (recent[0].routine_day_index + 1) % Math.max(1, latestRoutine.days.length);
  }
  const nextDay = latestRoutine?.days[nextDayIndex];

  // Week dots: Mon..Sun of the current week.
  const weekDays = buildWeekDots(recent.map((w) => new Date(w.started_at)));

  const bestLifts = exercises
    .filter((e) => e.best_e1rm != null)
    .sort((a, b) => (b.best_e1rm ?? 0) - (a.best_e1rm ?? 0))
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <PageHeader
        title={greeting(firstName)}
        subtitle={why ? `For: ${why}` : undefined}
        action={
          <Link href="/profile" aria-label="Profile">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-sm font-medium">
                {(profile?.username ?? "?")[0]?.toUpperCase()}
              </span>
            )}
          </Link>
        }
      />

      {/* Week at a glance: seven dots + streak. The simplest momentum visual. */}
      <Card className="flex items-center justify-between py-3">
        <div className="flex gap-2.5">
          {weekDays.map((d) => (
            <div key={d.label} className="flex flex-col items-center gap-1">
              <span
                className={
                  "h-2.5 w-2.5 rounded-full " +
                  (d.trained ? "bg-accent" : d.isToday ? "border border-accent/60" : "bg-border")
                }
              />
              <span className={"text-[9px] " + (d.isToday ? "text-text" : "text-muted")}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          {weeklyTarget != null && (
            <span
              className={
                "tabular text-sm font-semibold " +
                ((stats?.workoutsThisWeek ?? 0) >= weeklyTarget ? "text-success" : "text-text")
              }
            >
              {(stats?.workoutsThisWeek ?? 0) >= weeklyTarget
                ? "Week complete ✓"
                : `${stats?.workoutsThisWeek ?? 0}/${weeklyTarget} this week`}
            </span>
          )}
          {(stats?.weekStreak ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-accent">
              <FlameIcon className="h-4 w-4" />
              <span className="tabular text-xs font-semibold">{stats?.weekStreak}w streak</span>
            </span>
          )}
        </div>
      </Card>

      {/* TODAY — exactly one thing to do. */}
      {active ? (
        <Link href="/workout" className="block">
          <Card className="flex items-center justify-between border-accent/40 bg-accent/[0.07] py-4">
            <div>
              <p className="font-semibold">Workout in progress</p>
              <p className="text-xs text-muted">Started {relativeTime(active.started_at)} ago</p>
            </div>
            <span className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-text">
              Resume
            </span>
          </Card>
        </Link>
      ) : trainedToday ? (
        <Card className="py-4">
          <p className="font-semibold">Done for today ✓</p>
          <p className="mt-0.5 text-sm text-muted">
            Recovery is where the muscle gets built.{" "}
            {FEATURES.foodTracker && (
              <Link href="/food" className="text-accent">
                Hit your protein →
              </Link>
            )}
          </p>
        </Card>
      ) : lapsed ? (
        // The comeback card — no shame, just a lowered bar back in.
        <Link
          href={
            nextDay && latestRoutine
              ? `/workout?routine=${latestRoutine.id}&day=${nextDayIndex}`
              : "/workout"
          }
          className="block"
        >
          <Card className="border-accent/40 py-4">
            <p className="text-xs uppercase tracking-wide text-muted">
              It&apos;s been {daysSinceLast} days
            </p>
            <p className="mt-1 text-lg font-semibold">One session restarts everything.</p>
            <p className="mt-0.5 text-sm text-muted">
              Go light. Half the sets count double today.
            </p>
            <span className="mt-3 inline-block rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-text">
              Ease back in
            </span>
          </Card>
        </Link>
      ) : nextDay && latestRoutine ? (
        <Link href={`/workout?routine=${latestRoutine.id}&day=${nextDayIndex}`} className="block">
          <Card className="flex items-center justify-between border-accent/40 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Up next · {latestRoutine.name}</p>
              <p className="text-lg font-semibold">{nextDay.name}</p>
              <p className="text-xs text-muted">{nextDay.exercises.length} exercises</p>
            </div>
            <span className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-text">
              Start
            </span>
          </Card>
        </Link>
      ) : (
        <LinkButton href="/workout" size="lg" className="w-full">
          Start today&apos;s workout
        </LinkButton>
      )}

      {/* AI coach */}
      {FEATURES.aiSplitHelper && (stats?.totalWorkouts ?? 0) > 0 && <CoachCard />}

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
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">Recent</h2>
          <Link href="/history" className="text-xs text-accent">
            All history
          </Link>
        </div>
        <ul className="space-y-2">
          {recent.slice(0, 3).map((w) => (
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
      </section>
    </div>
  );
}

function greeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 5 ? "Up late" : h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
  return name ? `${part}, ${name}` : part;
}

function buildWeekDots(dates: Date[]): { label: string; trained: boolean; isToday: boolean }[] {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const trainedKeys = new Set(dates.map((d) => dayKey(d)));
  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dayKey(d);
    return { label, trained: trainedKeys.has(key), isToday: key === dayKey(now) };
  });
}
