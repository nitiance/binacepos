# create_demo_session (DEMO ONLY)

This Edge Function provisions a per-visitor demo tenant.

## Safety
- Guarded by `DEMO_MODE=1`. If not set, it returns `404`.
- Keep this function **disabled in production** (`supabase/config.toml` sets `enabled=false`).

## Required Env (Demo Supabase project)
- `DEMO_MODE=1`
- `DEMO_IP_SALT=<random secret>` (used to hash visitor IPs for rate limiting)
- `DEMO_TTL_HOURS=24` (optional)
- Standard Supabase Edge Function envs:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## DB (Demo Supabase project)
Apply `supabase/demo_migrations/0001_demo_sessions.sql` in the demo project.

