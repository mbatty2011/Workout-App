# Deploy to Vercel — from your phone

Everything here works in a mobile browser. Total time ~10–15 min. You'll set up
a free Supabase backend, then connect the repo to Vercel for a public URL.

There are two accounts to create (both free, both phone-friendly): **Supabase**
(the database/login) and **Vercel** (hosts the app). Do Supabase first because
Vercel needs two keys from it.

---

## Part A — Supabase (the backend)

1. Go to **supabase.com** → sign in with GitHub → **New project**. Pick a name
   and a region near you. Wait ~2 min for it to provision.

2. **Run the database setup.** Left sidebar → **SQL Editor** → **+ New query**.
   You'll paste and run **three files from this repo, in order**. For each one:
   open the file on GitHub, tap the **copy** icon, paste into the SQL editor, tap
   **Run**.
   1. `supabase/migrations/0001_init.sql`
   2. `supabase/migrations/0002_storage.sql`
   3. `supabase/seed.sql`
   (Each should say "Success". Run them one at a time, top to bottom.)

3. **Make signup instant (recommended for testing).** Left sidebar →
   **Authentication** → **Sign In / Providers** → **Email** → turn **OFF**
   "Confirm email" → Save. This lets you sign up and land straight in the app
   without clicking an email link. (You can re-enable it later for real users.)

4. **Grab your keys.** Left sidebar → **Project Settings** → **API**. Keep this
   tab open — you need three values in Part B:
   - **Project URL**
   - **anon public** key
   - **service_role** key (under "Project API keys" — keep this one secret)

---

## Part B — Vercel (host the app)

1. Go to **vercel.com** → sign in with GitHub → **Add New… → Project**.

2. **Import** the `Workout-App` repo. When it asks for the branch/settings,
   make sure it's deploying **`claude/gym-app-build-prompt-8vubh`** (you can
   change the production branch later in Settings → Git). Framework should
   auto-detect as **Next.js** — leave the build settings default.

3. **Add Environment Variables** (expand that section before deploying). Add:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |

   Optional (features that otherwise just stay quiet):
   | `ANTHROPIC_API_KEY` | from console.anthropic.com — enables the AI split helper |
   | `USDA_API_KEY` | from the USDA signup link in the README — adds USDA foods |

4. Tap **Deploy**. ~1–2 min later you get a URL like
   **`workout-app-xxxx.vercel.app`**. Open it on your phone.

---

## Part C — Point Supabase at your live URL

So auth redirects resolve correctly:

- Supabase → **Authentication** → **URL Configuration** → set **Site URL** to
  your `https://…vercel.app` URL → Save.

---

## Use it

Open the Vercel URL → **Create account** → set a username + units → you're in.
On iPhone Safari / Android Chrome use **Share → Add to Home Screen** to install
it as an app (it's a PWA).

## If something's off

- **Login page just reloads / "Unauthorized":** an env var is missing or has a
  typo in Vercel → Settings → Environment Variables. After editing them, trigger
  a redeploy (Deployments → ⋯ → Redeploy).
- **"relation does not exist" type errors:** a migration didn't run — re-run the
  three SQL files in order.
- **Signup seems stuck:** confirm you turned off "Confirm email" (Part A step 3).
- **Photos won't upload:** make sure `0002_storage.sql` ran (it creates the
  `post-photos` bucket).
