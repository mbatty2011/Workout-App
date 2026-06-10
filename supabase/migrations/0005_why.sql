-- The user's own reason for training — the emotional anchor the app echoes
-- back at high-leverage moments (onboarding, home, workout finish).
alter table public.profiles add column if not exists why text;
