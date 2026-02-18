import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, corsHeadersAllowlist, json, parseAllowedHosts } from "../_shared/cors.ts";
import { hashPassword, validatePassword, verifyPassword } from "../_shared/password.ts";
import { getSupabaseEnv, supabaseAdminClient } from "../_shared/supabase.ts";

function sanitizeUsername(raw: string) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

function firstIpFromXff(xff: string) {
  return (
    xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)[0] || null
  );
}

function getClientIp(req: Request) {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return firstIpFromXff(xff);
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function intEnv(name: string, fallback: number) {
  const raw = String(Deno.env.get(name) || "").trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  role: "admin" | "cashier" | string | null;
  permissions: any;
  business_id: string | null;
  active: boolean | null;
};

type SecretRow = {
  password_salt: string | null;
  password_hash: string | null;
  password_iter: number | null;
};

const DUMMY_SECRET = {
  password_salt: "AAAAAAAAAAAAAAAAAAAAAA==", // 16 zero bytes
  password_hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", // 32 zero bytes
  password_iter: 210_000,
};

serve(async (req) => {
  const allowedHosts = parseAllowedHosts(Deno.env.get("AUTH_ALLOWED_ORIGINS") || null);
  const cors = corsHeadersAllowlist(req, allowedHosts);
  if (!cors) {
    if (req.method === "OPTIONS") return new Response(null, { status: 403 });
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  try {
    const env = getSupabaseEnv();

    const body = await req.json().catch(() => ({} as any));
    const username = sanitizeUsername(body?.username);
    const passRes = validatePassword(body?.password);

    if (!username) return json(400, { error: "Username required" }, cors);
    if (!passRes.ok) return json(400, { error: passRes.reason }, cors);

    const admin = supabaseAdminClient(env);

    // Rate limiting (best-effort; disabled if AUTH_IP_HASH_SALT is not configured)
    const ipRaw = getClientIp(req);
    const ip = ipRaw || "unknown";
    const salt = String(Deno.env.get("AUTH_IP_HASH_SALT") || Deno.env.get("DEMO_IP_HASH_SALT") || "").trim();
    const ip_hash = salt ? await sha256Hex(`${salt}|${ip}`) : null;

    if (ip_hash) {
      const windowMinutes = clampInt(intEnv("AUTH_RATE_LIMIT_WINDOW_MINUTES", 15), 1, 24 * 60);
      const maxPerIp = clampInt(intEnv("AUTH_RATE_LIMIT_MAX_PER_IP", 60), 1, 2000);
      const maxPerIpUser = clampInt(intEnv("AUTH_RATE_LIMIT_MAX_PER_IP_USER", 12), 1, 500);
      const sinceIso = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

      const ipCheck = await admin
        .from("auth_rate_limits")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ip_hash)
        .gte("created_at", sinceIso);

      if (!ipCheck.error && (ipCheck.count || 0) >= maxPerIp) {
        return json(429, { error: "Too many attempts. Try again later." }, cors);
      }

      const ipUserCheck = await admin
        .from("auth_rate_limits")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ip_hash)
        .eq("username", username)
        .gte("created_at", sinceIso);

      if (!ipUserCheck.error && (ipUserCheck.count || 0) >= maxPerIpUser) {
        return json(429, { error: "Too many attempts. Try again later." }, cors);
      }
    }

    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id, username, full_name, role, permissions, active, business_id")
      .eq("username", username)
      .maybeSingle();

    if (profErr) return json(500, { error: "Profile lookup failed" }, cors);
    if (!profile) {
      // Enumeration/timing resistance: do the same expensive work even when username doesn't exist.
      await verifyPassword(passRes.password, DUMMY_SECRET).catch(() => void 0);

      if (ip_hash) {
        await admin.from("auth_rate_limits").insert({
          ip_hash,
          username,
          ok: false,
          user_agent: req.headers.get("user-agent") || null,
        } as any).catch(() => void 0);
      }

      return json(401, { error: "Invalid credentials" }, cors);
    }

    const p = profile as ProfileRow;
    if (p.active === false) {
      await verifyPassword(passRes.password, DUMMY_SECRET).catch(() => void 0);
      if (ip_hash) {
        await admin.from("auth_rate_limits").insert({
          ip_hash,
          username,
          ok: false,
          user_agent: req.headers.get("user-agent") || null,
        } as any).catch(() => void 0);
      }
      return json(401, { error: "Invalid credentials" }, cors);
    }

    // Resolve the Auth user's actual email (some projects may not use the synthetic username@binancexi-pos.app mapping)
    let authEmail = `${p.username}@binancexi-pos.app`;
    try {
      const { data: authUser, error: authUserErr } = await admin.auth.admin.getUserById(p.id);
      if (!authUserErr && authUser?.user?.email) authEmail = authUser.user.email;
    } catch {
      // ignore; fallback to synthetic email
    }

    let ok = false;

    // Prefer hashed passwords in profile_secrets
    const { data: secret, error: secErr } = await admin
      .from("profile_secrets")
      .select("password_salt, password_hash, password_iter")
      .eq("id", p.id)
      .maybeSingle();

    if (secErr) {
      return json(500, {
        error: "Password store not configured",
        details: secErr.message,
      }, cors);
    }

    const s = (secret as SecretRow | null) || null;
    if (s?.password_salt && s?.password_hash && s?.password_iter) {
      ok = await verifyPassword(passRes.password, {
        password_salt: s.password_salt,
        password_hash: s.password_hash,
        password_iter: s.password_iter,
      });
    } else {
      // Migration path: verify against Supabase Auth password (username-mapped email),
      // then store a PBKDF2 hash in profile_secrets for offline-first login.
      if (!env.anonKey) return json(401, { error: "Password not set yet. Ask an admin to set your password." }, cors);

      const publicClient = createClient(env.url, env.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      const { data: signIn, error: signErr } = await publicClient.auth.signInWithPassword({
        email: authEmail,
        password: passRes.password,
      });
      if (signErr || !signIn?.user) {
        if (ip_hash) {
          await admin.from("auth_rate_limits").insert({
            ip_hash,
            username,
            ok: false,
            user_agent: req.headers.get("user-agent") || null,
          } as any).catch(() => void 0);
        }
        return json(401, { error: "Invalid credentials" }, cors);
      }

      ok = true;

      const hashed = await hashPassword(passRes.password);
      await admin.from("profile_secrets").upsert({
        id: p.id,
        ...hashed,
        updated_at: new Date().toISOString(),
      });
    }

    if (!ok) {
      if (ip_hash) {
        await admin.from("auth_rate_limits").insert({
          ip_hash,
          username,
          ok: false,
          user_agent: req.headers.get("user-agent") || null,
        } as any).catch(() => void 0);
      }
      return json(401, { error: "Invalid credentials" }, cors);
    }

    // ✅ Create a one-time magiclink token hash so the client can mint a real Supabase Auth session JWT
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
    });

    if (linkErr || !link?.properties?.hashed_token) {
      return json(500, {
        error: "Failed to create session token",
        details: linkErr?.message || "missing hashed_token",
      }, cors);
    }

    if (ip_hash) {
      await admin.from("auth_rate_limits").insert({
        ip_hash,
        username,
        ok: true,
        user_agent: req.headers.get("user-agent") || null,
      } as any).catch(() => void 0);
    }

    return json(200, {
      ok: true,
      user: {
        id: p.id,
        username: p.username,
        full_name: p.full_name,
        role: p.role,
        permissions: p.permissions || {},
        business_id: p.business_id,
        active: p.active,
      },
      token_hash: link.properties.hashed_token,
      type: "magiclink",
    }, cors);
  } catch (e: any) {
    return json(500, { error: "Unhandled error", details: e?.message || String(e) }, cors);
  }
});
