-- =============================================================================
-- yours — initial schema
-- Row-Level Security is enabled on every table. A user can only read/write
-- their own rows, except the social feed which is read-shared per privacy
-- setting (spec §4, §7). Never trust the client for authorization.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  unit text not null default 'kg' check (unit in ('kg', 'lb')),
  is_private boolean not null default false,
  is_minor boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profiles are readable by anyone (public directory), but a private account's
-- detail is gated at the application layer; the row itself only exposes
-- non-sensitive fields. Writes are self-only.
create policy "profiles_select_all" on public.profiles
  for select using (true);
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- exercises (seeded starter library + user custom)
-- -----------------------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text not null,
  equipment text,
  is_custom boolean not null default false,
  created_by uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists exercises_name_idx on public.exercises using gin (to_tsvector('simple', name));
create index if not exists exercises_muscle_idx on public.exercises (muscle_group);

alter table public.exercises enable row level security;

-- Seeded (non-custom) exercises are visible to everyone. Custom exercises are
-- visible only to their creator.
create policy "exercises_select" on public.exercises
  for select using (is_custom = false or created_by = auth.uid());
create policy "exercises_insert_self" on public.exercises
  for insert with check (created_by = auth.uid() and is_custom = true);
create policy "exercises_update_self" on public.exercises
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "exercises_delete_self" on public.exercises
  for delete using (created_by = auth.uid());

-- -----------------------------------------------------------------------------
-- routines (splits)
-- -----------------------------------------------------------------------------
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  days jsonb not null default '[]'::jsonb, -- ordered day -> exercise list w/ target sets/reps
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists routines_owner_idx on public.routines (owner_id);
create index if not exists routines_public_idx on public.routines (is_public) where is_public = true;

alter table public.routines enable row level security;

create policy "routines_select" on public.routines
  for select using (owner_id = auth.uid() or is_public = true);
create policy "routines_insert_self" on public.routines
  for insert with check (owner_id = auth.uid());
create policy "routines_update_self" on public.routines
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "routines_delete_self" on public.routines
  for delete using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- workouts (a logged session)
-- -----------------------------------------------------------------------------
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid references public.routines (id) on delete set null,
  routine_day_index int,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  note text
);

create index if not exists workouts_owner_idx on public.workouts (owner_id, started_at desc);

alter table public.workouts enable row level security;

create policy "workouts_select_self" on public.workouts
  for select using (owner_id = auth.uid());
create policy "workouts_insert_self" on public.workouts
  for insert with check (owner_id = auth.uid());
create policy "workouts_update_self" on public.workouts
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "workouts_delete_self" on public.workouts
  for delete using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- workout_sets
-- -----------------------------------------------------------------------------
create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  set_index int not null,
  reps int,
  weight numeric,
  rpe numeric,
  is_warmup boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists workout_sets_workout_idx on public.workout_sets (workout_id);
create index if not exists workout_sets_exercise_idx on public.workout_sets (exercise_id);

alter table public.workout_sets enable row level security;

-- Authorization is delegated to the parent workout's owner.
create policy "workout_sets_select_self" on public.workout_sets
  for select using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.owner_id = auth.uid()
  ));
create policy "workout_sets_insert_self" on public.workout_sets
  for insert with check (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.owner_id = auth.uid()
  ));
create policy "workout_sets_update_self" on public.workout_sets
  for update using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.owner_id = auth.uid()
  ));
create policy "workout_sets_delete_self" on public.workout_sets
  for delete using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.owner_id = auth.uid()
  ));

-- -----------------------------------------------------------------------------
-- follows
-- -----------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id)
);

create index if not exists follows_followee_idx on public.follows (followee_id, status);

alter table public.follows enable row level security;

-- Either party in the relationship can see it.
create policy "follows_select" on public.follows
  for select using (follower_id = auth.uid() or followee_id = auth.uid());
-- A user creates their own outgoing follow.
create policy "follows_insert_self" on public.follows
  for insert with check (follower_id = auth.uid());
-- The followee approves/declines (updates status); the follower can also
-- update (e.g. unfollow handled via delete).
create policy "follows_update" on public.follows
  for update using (followee_id = auth.uid() or follower_id = auth.uid());
create policy "follows_delete" on public.follows
  for delete using (follower_id = auth.uid() or followee_id = auth.uid());

-- helper: is the current user an accepted follower of :target ?
create or replace function public.is_accepted_follower(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.follows f
    where f.follower_id = auth.uid()
      and f.followee_id = target
      and f.status = 'accepted'
  );
$$;

-- -----------------------------------------------------------------------------
-- posts (social)
-- -----------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  workout_id uuid references public.workouts (id) on delete set null,
  caption text,
  photo_url text,
  visibility text not null default 'followers' check (visibility in ('public', 'followers', 'private')),
  created_at timestamptz not null default now()
);

create index if not exists posts_owner_idx on public.posts (owner_id, created_at desc);
create index if not exists posts_feed_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

-- Read rules honor visibility (spec §5.6 / §7):
--   own posts          -> always
--   public             -> anyone signed in
--   followers          -> accepted followers only
--   private            -> owner only
create policy "posts_select" on public.posts
  for select using (
    owner_id = auth.uid()
    or visibility = 'public'
    or (visibility = 'followers' and public.is_accepted_follower(owner_id))
  );
create policy "posts_insert_self" on public.posts
  for insert with check (owner_id = auth.uid());
create policy "posts_update_self" on public.posts
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "posts_delete_self" on public.posts
  for delete using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- post_likes
-- -----------------------------------------------------------------------------
create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

-- You can like a post you are allowed to see; visibility is checked against posts.
create policy "post_likes_select" on public.post_likes
  for select using (exists (select 1 from public.posts p where p.id = post_id));
create policy "post_likes_insert_self" on public.post_likes
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "post_likes_delete_self" on public.post_likes
  for delete using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- post_comments
-- -----------------------------------------------------------------------------
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

create policy "post_comments_select" on public.post_comments
  for select using (exists (select 1 from public.posts p where p.id = post_id));
create policy "post_comments_insert_self" on public.post_comments
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "post_comments_delete_self" on public.post_comments
  for delete using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- reports (basic safety: report a comment/post before social opens up — §7)
-- -----------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'user')),
  target_id uuid not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "reports_insert_self" on public.reports
  for insert with check (reporter_id = auth.uid());
create policy "reports_select_self" on public.reports
  for select using (reporter_id = auth.uid());

-- blocks (basic safety)
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.blocks enable row level security;

create policy "blocks_select_self" on public.blocks
  for select using (blocker_id = auth.uid());
create policy "blocks_insert_self" on public.blocks
  for insert with check (blocker_id = auth.uid());
create policy "blocks_delete_self" on public.blocks
  for delete using (blocker_id = auth.uid());

-- -----------------------------------------------------------------------------
-- foods (cache of external nutrition data)
-- -----------------------------------------------------------------------------
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('usda', 'off')),
  external_id text not null,
  name text not null,
  brand text,
  serving text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists foods_name_idx on public.foods using gin (to_tsvector('simple', name));

alter table public.foods enable row level security;

-- The food cache is shared (it holds public nutrition facts, not user data).
-- Reads for everyone; writes happen via the server adapter (service role).
create policy "foods_select_all" on public.foods
  for select using (true);
create policy "foods_insert_auth" on public.foods
  for insert with check (auth.uid() is not null);

-- -----------------------------------------------------------------------------
-- food_logs
-- -----------------------------------------------------------------------------
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  food_id uuid not null references public.foods (id),
  logged_at timestamptz not null default now(),
  servings numeric not null default 1,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack'))
);

create index if not exists food_logs_owner_idx on public.food_logs (owner_id, logged_at desc);

alter table public.food_logs enable row level security;

create policy "food_logs_select_self" on public.food_logs
  for select using (owner_id = auth.uid());
create policy "food_logs_insert_self" on public.food_logs
  for insert with check (owner_id = auth.uid());
create policy "food_logs_update_self" on public.food_logs
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "food_logs_delete_self" on public.food_logs
  for delete using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- weight_logs
-- -----------------------------------------------------------------------------
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  logged_at timestamptz not null default now(),
  weight numeric not null,
  unit text not null default 'kg' check (unit in ('kg', 'lb'))
);

create index if not exists weight_logs_owner_idx on public.weight_logs (owner_id, logged_at desc);

alter table public.weight_logs enable row level security;

create policy "weight_logs_select_self" on public.weight_logs
  for select using (owner_id = auth.uid());
create policy "weight_logs_insert_self" on public.weight_logs
  for insert with check (owner_id = auth.uid());
create policy "weight_logs_update_self" on public.weight_logs
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "weight_logs_delete_self" on public.weight_logs
  for delete using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- goals
-- -----------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('weight', 'calorie', 'protein', 'workouts_per_week')),
  target numeric not null,
  period text,
  created_at timestamptz not null default now()
);

create index if not exists goals_owner_idx on public.goals (owner_id);

alter table public.goals enable row level security;

create policy "goals_select_self" on public.goals
  for select using (owner_id = auth.uid());
create policy "goals_insert_self" on public.goals
  for insert with check (owner_id = auth.uid());
create policy "goals_update_self" on public.goals
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "goals_delete_self" on public.goals
  for delete using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- aggregate view for the AI split helper ("based on what people are using")
-- Anonymized: counts only, no owner identity. Reads from public routines.
-- -----------------------------------------------------------------------------
create or replace view public.popular_exercise_pairs as
select
  e.name as exercise_name,
  e.muscle_group,
  count(*) as usage_count
from public.routines r
cross join lateral jsonb_array_elements(r.days) as day
cross join lateral jsonb_array_elements(day -> 'exercises') as ex
join public.exercises e on e.id = (ex ->> 'exercise_id')::uuid
where r.is_public = true
group by e.name, e.muscle_group
order by usage_count desc;
