-- BinanceXI POS: auth rate limiting support for verify_password edge function.
-- Server-only table (RLS enabled, no policies).

begin;

create table if not exists public.auth_rate_limits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ip_hash text not null,
  username text not null,
  ok boolean not null default false,
  user_agent text null
);

create index if not exists auth_rate_limits_ip_user_created_idx
  on public.auth_rate_limits (ip_hash, username, created_at desc);

create index if not exists auth_rate_limits_ip_created_idx
  on public.auth_rate_limits (ip_hash, created_at desc);

create index if not exists auth_rate_limits_user_created_idx
  on public.auth_rate_limits (username, created_at desc);

alter table public.auth_rate_limits enable row level security;

commit;

