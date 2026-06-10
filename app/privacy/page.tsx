import Link from "next/link";
import { BRAND } from "@/config/brand";

/** Plain-language privacy note (spec §7) — required before charging users. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-md space-y-5 px-6 py-12 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Privacy, in plain language</h1>
      <p className="text-muted">How {BRAND.name} handles your data.</p>

      <Section title="What we store">
        Your account (email, username), the things you log (workouts, sets, food,
        bodyweight, goals), and anything you choose to post (captions, photos,
        videos). That&apos;s it — we collect the minimum needed to run the app.
      </Section>

      <Section title="Who can see what">
        Your logs are private to you. Posts follow the visibility you pick —
        public, followers, or only you. Private accounts approve every follower.
        If you mark a split &quot;public&quot;, its exercises feed anonymous, aggregated
        popularity stats (never your name).
      </Section>

      <Section title="AI features">
        When you use an AI feature (split generation, label scanning, weekly
        recap), the relevant data — your inputs, and a photo if you attach one —
        is sent to Anthropic&apos;s API to generate the result, and isn&apos;t used to
        train their models per their API terms. Photos you send for analysis are
        not stored by us unless you explicitly save or post them.
      </Section>

      <Section title="What we never do">
        We don&apos;t sell your data. We don&apos;t show ads. We don&apos;t attach your
        location to posts. We don&apos;t run engagement algorithms on your feed.
      </Section>

      <Section title="Your controls">
        You can make your account private, block or report anyone, delete any
        log or post, and delete your account — which removes your data.
      </Section>

      <p className="pt-2 text-muted">
        Questions? Reach out to the developer.{" "}
        <Link href="/login" className="text-accent underline-offset-4 hover:underline">
          Back to {BRAND.name}
        </Link>
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 font-medium text-text">{title}</h2>
      <p className="text-muted">{children}</p>
    </section>
  );
}
