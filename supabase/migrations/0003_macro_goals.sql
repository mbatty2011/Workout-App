-- Extend goal types to support a full daily macro plan (carbs + fat), so a user
-- can set calories/protein/carbs/fat targets together as a "diet".
alter table public.goals drop constraint if exists goals_type_check;
alter table public.goals add constraint goals_type_check
  check (type in ('weight', 'calorie', 'protein', 'carbs', 'fat', 'workouts_per_week'));
