import Link from "next/link";
import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { listRoutines } from "@/modules/routines/queries";
import { StartFoundation } from "@/modules/routines/components/StartFoundation";
import { Card, LinkButton, PageHeader, Pill } from "@/components/ui";

export default async function RoutinesPage() {
  if (!FEATURES.splitBuilder) redirect("/");
  const routines = await listRoutines();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Splits"
        subtitle="Build a routine, start today's day pre-filled."
        action={
          <LinkButton href="/routines/new" size="sm">
            New
          </LinkButton>
        }
      />

      {FEATURES.aiSplitHelper && (
        <LinkButton href="/routines/ai" variant="outline" className="w-full">
          ✨ Generate with AI
        </LinkButton>
      )}

      {routines.length === 0 ? (
        <div className="space-y-4 rounded-2xl border border-dashed border-border px-5 py-8">
          <div className="text-center">
            <p className="font-medium">You don&apos;t need to design anything.</p>
            <p className="mt-1 text-sm text-muted">
              Start with our 3-day beginner plan — or have the AI build one around you.
            </p>
          </div>
          <StartFoundation label="Use the Foundation plan" />
          <div className="text-center text-sm text-muted">
            or{" "}
            <Link href="/routines/ai" className="text-accent">
              generate with AI
            </Link>{" "}
            ·{" "}
            <Link href="/routines/new" className="text-accent">
              build by hand
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {routines.map((r) => (
            <li key={r.id}>
              <Card className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/routines/${r.id}`} className="font-medium">
                      {r.name}
                    </Link>
                    {r.description && (
                      <p className="text-sm text-muted">{r.description}</p>
                    )}
                  </div>
                  {r.is_public && <Pill tone="accent">public</Pill>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.days.map((day, i) => (
                    <LinkButton
                      key={i}
                      href={`/workout?routine=${r.id}&day=${i}`}
                      size="sm"
                      variant="outline"
                    >
                      ▶ {day.name}
                    </LinkButton>
                  ))}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
