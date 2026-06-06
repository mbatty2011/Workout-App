import Link from "next/link";
import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { getCurrentProfile } from "@/modules/auth/queries";
import { ProfileSettings } from "@/modules/auth/components/ProfileSettings";
import { listRecentWorkouts } from "@/modules/workouts/queries";
import { getUserPosts, getFollowCounts } from "@/modules/social/queries";
import { Card, LinkButton, PageHeader, Stat } from "@/components/ui";
import { relativeTime } from "@/lib/utils";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/onboarding");

  const recent = FEATURES.workoutLogging ? await listRecentWorkouts(5) : [];
  const posts = FEATURES.socialFeed ? await getUserPosts(profile.id, 6) : [];
  const counts = FEATURES.socialFeed
    ? await getFollowCounts(profile.id)
    : { followers: 0, following: 0 };

  return (
    <div className="space-y-5">
      <PageHeader title={profile.display_name ?? profile.username} subtitle={`@${profile.username}`} />

      {FEATURES.socialFeed && (
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Posts" value={`${posts.length}`} />
          <Stat label="Followers" value={`${counts.followers}`} />
          <Stat label="Following" value={`${counts.following}`} />
        </div>
      )}

      <ProfileSettings profile={profile} />

      <div className="grid grid-cols-2 gap-2">
        {FEATURES.weightGoals && (
          <LinkButton href="/goals" variant="outline">
            Weight & goals
          </LinkButton>
        )}
        {FEATURES.progress && (
          <LinkButton href="/progress" variant="outline">
            Progress
          </LinkButton>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Recent workouts</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">No workouts yet.</p>
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
