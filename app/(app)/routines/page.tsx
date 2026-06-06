import Link from "next/link";
import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { listRoutines } from "@/modules/routines/queries";
import { Card, EmptyState, LinkButton, PageHeader, Pill } from "@/components/ui";

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
        <EmptyState
          title="No splits yet"
          subtitle="Create one by hand or let the AI helper draft one you can edit."
          action={
            <LinkButton href="/routines/new" size="sm">
              Build a split
            </LinkButton>
          }
        />
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
