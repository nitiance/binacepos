# create_demo_session (Live Demo, Same Supabase Project)

This Edge Function provisions a **per-visitor demo tenant** (business + admin user + seeded data).

## Required Env (Supabase Edge Function)
- `DEMO_ALLOWED_ORIGINS` (comma-separated origins/hosts)
- `DEMO_IP_HASH_SALT` (required secret)
- `DEMO_RATE_LIMIT_MAX` (default `3`)
- `DEMO_RATE_LIMIT_WINDOW_MINUTES` (default `60`)
- `DEMO_TTL_HOURS` (default `24`)

## DB
Apply migrations:
- `supabase/migrations/0013_demo_sessions.sql`
- `supabase/migrations/0014_stock_rpc_tenant_guard.sql`

## Notes
- `verify_jwt=false` by design (public provisioning endpoint). Guard rails are origin allowlist + rate limiting.
- Demo cleanup runs opportunistically when new demos are created.
