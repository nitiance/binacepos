-- BinanceXI POS: per-visitor live demo sessions
-- Adds `businesses.is_demo` and a server-only `demo_sessions` table.

begin;

alter table if exists public.businesses
  add column if not exists is_demo boolean not null default false;

create index if not exists businesses_is_demo_idx on public.businesses (is_demo);

create table if not exists public.demo_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text null,
  email text null,
  ip_hash text not null,
  user_agent text null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- If an older/demo-only version exists, keep it and just add any missing fields.
alter table if exists public.demo_sessions
  add column if not exists business_id uuid,
  add column if not exists user_id uuid,
  add column if not exists username text,
  add column if not exists email text,
  add column if not exists ip_hash text,
  add column if not exists user_agent text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz;

create index if not exists demo_sessions_ip_created_idx on public.demo_sessions (ip_hash, created_at desc);
create index if not exists demo_sessions_expires_idx on public.demo_sessions (expires_at);
create index if not exists demo_sessions_business_idx on public.demo_sessions (business_id);

alter table public.demo_sessions enable row level security;
-- No policies: deny all from client; Edge Functions (service_role) bypasses RLS.

commit;
