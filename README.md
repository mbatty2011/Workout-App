# yours — a calm gym log

> *Less, better.* Build a split, log fast, watch your numbers move.

A mobile-first PWA gym app: workout logging, splits, progress/PRs, food
(calories + protein), bodyweight & goals, a calm social feed, and an AI split
helper grounded in what people actually use.

Stack: **Next.js (App Router, TS) · Supabase (Postgres + Auth + Storage, RLS) ·
Tailwind · Anthropic API (server-side)**.

> **On your phone / want a public URL?** Follow [`DEPLOY.md`](./DEPLOY.md) to
> deploy to Vercel + Supabase entirely from a mobile browser (~10 min).

---

## Quickstart (run it locally)

This is a normal Next.js app — you run it on your own machine. It needs a free
Supabase project for auth/data.

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

1. Make a free project at <https://supabase.com>.
2. In the SQL editor, run the migrations **in order**, then the seed:
   - `supabase/migrations/0001_init.sql`  (tables + RLS + the popular-routines view)
   - `supabase/migrations/0002_storage.sql` (post-photos bucket + policies)
   - `supabase/seed.sql` (~150 starter exercises)
3. (Optional) Enable an email provider under **Authentication → Providers**.

### 3. Configure env

```bash
cp .env.example .env.local
```

Fill in:

| Var | Where | Needed for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | everything |
| `SUPABASE_SERVICE_ROLE_KEY` | same page (keep secret) | food cache writes |
| `ANTHROPIC_API_KEY` | <https://console.anthropic.com> | AI split helper |
| `USDA_API_KEY` | <https://fdc.nal.usda.gov/api-key-signup.html> | USDA food search (Open Food Facts needs no key) |

The app **builds and runs without** the AI/USDA keys — those features just
degrade gracefully.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>. Sign up → pick a username + units → you land on an
empty but functional home. Add it to your phone's home screen to use it as an
installable PWA.

### Other commands

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run start      # run the production build
```

---

## Customization (so this stays yours)

These are one-file changes:

- **Rename / re-theme** → `config/brand.ts` (+ the CSS variables in
  `app/globals.css`).
- **Turn a feature on/off** → `config/features.ts`. Every screen checks its flag
  and degrades gracefully.
- **Swap food data or the AI provider** → its adapter only
  (`modules/food/adapters/*`, `modules/ai/adapters/*`) — no feature-code changes.

## Architecture

- `config/` — feature flags + brand tokens (single sources of truth).
- `modules/<feature>/` — self-contained: `queries.ts` (server reads),
  `actions.ts` (server writes / `"use server"`), `components/`, `types.ts`.
  **No business logic in components.**
- `lib/supabase/` — typed clients: `server` (RLS, cookies), `client` (browser),
  `admin` (service-role, server-only), `middleware` (session refresh + gate).
- `app/` — App Router routes. `(app)/` is the authed shell with the bottom nav.
- All third-party data sits behind a single adapter interface each
  (`NutritionProvider`, `AISplitProvider`).

## Charging for it (covering the AI cost)

The AI features (split generation, label scanning, weekly coach) are the only
metered cost — everything else fits free tiers. The lowest-effort path to a
price tier that covers Anthropic spend:

1. **Stripe Payment Link** (no SDK needed): create a product ("Pro — AI coach",
   e.g. $3–5/mo) in the Stripe dashboard and copy its payment link.
2. Add an `is_pro boolean default false` column to `profiles`.
3. Point the payment link's webhook (checkout.session.completed) at a small
   route that flips `is_pro` for the matching email.
4. Gate the three AI routes (`/api/ai/*`, `/api/food/scan`) on `is_pro` and
   show the payment link where the gate trips.

Rough cost math: each AI call is a few cents at most; a $4/mo tier covers a
heavy user comfortably. Until then, AI runs on your own `ANTHROPIC_API_KEY`.

## What's in v1 (and what's parked)

Built: auth/profile, exercise library, workout logging (optimistic, rest timer,
previous-session autofill), split builder, progress + PRs, weight & goals, food
tracker, social feed (photos + text), AI split helper.

Parked OFF by default (see `config/features.ts` and spec §6 for the constraint
behind each): Apple Watch / HealthKit, Spotify, video posts.
