create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_devices_auth_user_enabled on public.push_devices(auth_user_id) where enabled;
alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated;
grant all on public.push_devices to service_role;
