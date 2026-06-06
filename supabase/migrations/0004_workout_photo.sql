-- Let a finished workout carry a note (already present) and a photo.
alter table public.workouts add column if not exists photo_url text;
