import { redirect } from "next/navigation";
import { BRAND } from "@/config/brand";
import { getUserId } from "@/modules/auth/queries";
import { AuthForm } from "@/modules/auth/components/AuthForm";
import {
  DumbbellIcon,
  SparkIcon,
  FoodIcon,
  TrendIcon,
  FeedIcon,
  CameraIcon,
} from "@/components/icons";

const FEATURES_COPY = [
  {
    Icon: DumbbellIcon,
    title: "Logging that keeps up",
    body: "Tap-to-complete sets, auto-filled from last session, rest timer built in. Never wait on the network mid-set.",
  },
  {
    Icon: SparkIcon,
    title: "An AI that actually knows you",
    body: "Generate a split from your goal, schedule, equipment — even a physique photo. Get a weekly coach recap of your training and diet.",
  },
  {
    Icon: CameraIcon,
    title: "Scan the label, skip the typing",
    body: "Point your camera at any nutrition label. We read the macros and tell you straight if it fits your day.",
  },
  {
    Icon: FoodIcon,
    title: "Meals that add themselves up",
    body: "Build meals from ingredients, set a macro plan, and watch calories, protein, carbs and fat total automatically.",
  },
  {
    Icon: TrendIcon,
    title: "Progress you can see",
    body: "Est. 1RM, top sets, volume — charted per exercise. PRs celebrated the moment they happen.",
  },
  {
    Icon: FeedIcon,
    title: "A feed without the noise",
    body: "Share lifts and meals with friends in a clean, swipeable feed. Chronological. No algorithm.",
  },
];

export default async function LoginPage() {
  if (await getUserId()) redirect("/");

  return (
    <main className="mx-auto max-w-md px-6 pb-16">
      {/* Hero */}
      <header className="pt-16 text-center">
        <p className="mx-auto mb-5 inline-block rounded-full border border-border px-3 py-1 text-xs text-muted">
          Train · Eat · Progress
        </p>
        <h1 className="text-5xl font-semibold lowercase tracking-tight text-accent">
          {BRAND.name}
        </h1>
        <p className="mt-3 text-lg leading-snug text-text">
          The calm gym app with a sharp&nbsp;AI&nbsp;coach.
        </p>
        <p className="mt-1.5 text-sm text-muted">{BRAND.description}</p>
      </header>

      {/* Auth */}
      <section className="mt-10 rounded-2xl border border-border bg-surface p-5">
        <AuthForm />
      </section>

      {/* Features */}
      <section className="mt-12 space-y-3">
        {FEATURES_COPY.map(({ Icon, title, body }) => (
          <div key={title} className="flex gap-3.5 rounded-2xl border border-border bg-surface p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-medium leading-tight">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          </div>
        ))}
      </section>

      <footer className="mt-12 text-center text-xs text-muted">
        <p>{BRAND.tagline}</p>
        <p className="mt-1">Free to start. Install it from your browser — no app store needed.</p>
      </footer>
    </main>
  );
}
