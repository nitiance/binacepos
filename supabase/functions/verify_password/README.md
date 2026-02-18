# verify_password (username/password -> Supabase session token hash)

This Edge Function verifies a staff username/password against `profile_secrets` (PBKDF2) and returns a one-time `hashed_token`
that the client uses with `supabase.auth.verifyOtp()` to mint a real Supabase Auth session (JWT).

## Security Notes
- This endpoint is intentionally public (`verify_jwt=false`) so the login screen can call it.
- It is protected by rate limiting (DB table) and optional origin allowlisting.

## Required DB
Apply migrations:
- `supabase/migrations/0016_auth_rate_limits.sql`

## Supabase Edge Function Env
### Recommended
- `AUTH_IP_HASH_SALT` (random secret; used to hash client IPs for rate limiting)
- `AUTH_ALLOWED_ORIGINS` (comma-separated hosts/origins allowed for browser calls)
  - Example: `binacepos.vercel.app,localhost`

### Optional (rate limit tuning)
- `AUTH_RATE_LIMIT_WINDOW_MINUTES` (default `15`)
- `AUTH_RATE_LIMIT_MAX_PER_IP` (default `60`)
- `AUTH_RATE_LIMIT_MAX_PER_IP_USER` (default `12`)

