-- DEMO ONLY (do not apply to production): per-visitor demo sessions
begin;

create table if not exists public.demo_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ip_hash text not null,
  email text null,
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  username text not null,
  user_agent text null,
  purged_at timestamptz null
);

create index if not exists demo_sessions_ip_created_idx on public.demo_sessions (ip_hash, created_at desc);
create index if not exists demo_sessions_expires_idx on public.demo_sessions (expires_at, purged_at);

alter table public.demo_sessions enable row level security;
-- No policies: deny all from client; Edge Functions (service_role) bypasses RLS.

commit;

