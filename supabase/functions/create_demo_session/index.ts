import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { hashPassword } from "../_shared/password.ts";
import { getSupabaseEnv, supabaseAdminClient } from "../_shared/supabase.ts";

function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const fly = req.headers.get("fly-client-ip");
  if (fly) return fly.trim();
  return null;
}

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomString(len: number, alphabet: string) {
  const out: string[] = [];
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out.push(alphabet[bytes[i] % alphabet.length]);
  return out.join("");
}

function sanitizeEmail(raw: unknown) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return null;
  if (s.length > 254) return null;
  // Minimal check; we do not send email in v1.
  if (!s.includes("@") || !s.includes(".")) return null;
  return s;
}

async function bestEffortCleanup(admin: ReturnType<typeof supabaseAdminClient>) {
  const nowIso = new Date().toISOString();
  const { data } = await admin
    .from("demo_sessions")
    .select("id, business_id")
    .lt("expires_at", nowIso)
    .is("purged_at", null)
    .order("expires_at", { ascending: true })
    .limit(10);

  if (!Array.isArray(data) || data.length === 0) return;

  for (const s of data as any[]) {
    const id = String(s?.id || "").trim();
    const business_id = String(s?.business_id || "").trim();
    if (!id || !business_id) continue;

    // Prefer "disable access" over hard deletes (orders/users may have FKs).
    await admin.from("businesses").update({ status: "suspended" }).eq("id", business_id);
    await admin.from("business_billing").update({ locked_override: true }).eq("business_id", business_id);
    await admin.from("profiles").update({ active: false }).eq("business_id", business_id);
    await admin.from("business_devices").update({ active: false }).eq("business_id", business_id);

    await admin.from("demo_sessions").update({ purged_at: nowIso }).eq("id", id);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // Guard: if accidentally deployed to production, keep it inert.
  if (String(Deno.env.get("DEMO_MODE") || "").trim() !== "1") {
    return json(404, { error: "Not found" });
  }

  try {
    const env = getSupabaseEnv();
    const admin = supabaseAdminClient(env);

    const body = await req.json().catch(() => ({} as any));
    const email = sanitizeEmail((body as any)?.email);

    const ip = getClientIp(req) || "0.0.0.0";
    const salt = String(Deno.env.get("DEMO_IP_SALT") || "demo").trim();
    const ip_hash = await sha256Hex(`${ip}|${salt}`);

    // Opportunistic cleanup of expired demo tenants.
    await bestEffortCleanup(admin);

    // Rate limit: max 3 sessions per IP per 24 hours.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: rateErr } = await admin
      .from("demo_sessions")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ip_hash)
      .gte("created_at", since);
    if (rateErr) {
      return json(500, { error: "Rate limit check failed" });
    }
    if ((count || 0) >= 3) {
      return json(429, { error: "Too many demo sessions from this network. Try again later." });
    }

    const ttlHours = Math.max(1, Math.min(72, Number(Deno.env.get("DEMO_TTL_HOURS") || "24") || 24));
    const expires_at = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    // Create business
    const bizName = `Demo ${randomString(6, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789")}`;
    const { data: biz, error: bizErr } = await admin
      .from("businesses")
      .insert({ name: bizName, status: "active", plan_type: "business_system" })
      .select("id")
      .single();
    if (bizErr || !biz?.id) {
      return json(500, { error: "Failed to create demo business" });
    }
    const business_id = String((biz as any).id);

    // Ensure billing is active until expiry (grace=0, max_devices high to reduce friction).
    const { error: billErr } = await admin.from("business_billing").upsert(
      {
        business_id,
        grace_days: 0,
        paid_through: expires_at,
        locked_override: false,
        max_devices: 5,
        currency: "USD",
      } as any,
      { onConflict: "business_id" }
    );
    if (billErr) {
      return json(500, { error: "Failed to initialize demo billing" });
    }

    // Create demo admin user
    const username = `demo_${randomString(8, "abcdefghijklmnopqrstuvwxyz0123456789")}`;
    const password = randomString(18, "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*");
    const full_name = "Demo Admin";
    const permissions = {
      allowRefunds: true,
      allowVoid: true,
      allowPriceEdit: true,
      allowDiscount: true,
      allowReports: true,
      allowInventory: true,
      allowSettings: true,
      allowEditReceipt: true,
    };

    const authEmail = `${username}@binancexi-pos.app`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr || !created.user?.id) {
      return json(500, { error: createErr?.message || "Failed to create demo user" });
    }
    const user_id = String(created.user.id);

    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: user_id,
        username,
        full_name,
        role: "admin",
        permissions,
        active: true,
        business_id,
        is_support: false,
      } as any,
      { onConflict: "id" }
    );
    if (profileErr) {
      return json(500, { error: "Failed to create demo profile" });
    }

    const passHash = await hashPassword(password);
    const { error: passErr } = await admin.from("profile_secrets").upsert(
      {
        id: user_id,
        ...passHash,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "id" }
    );
    if (passErr) {
      return json(500, { error: "Password storage failed" });
    }

    // Seed store settings
    await admin.from("store_settings").upsert(
      {
        business_id,
        id: "default",
        business_name: bizName,
        currency: "USD",
        show_qr_code: true,
        qr_code_data: null,
        footer_message: "Thanks for trying BinanceXI POS (Demo).",
        tax_included: false,
        tax_rate: 0,
        low_stock_alerts: true,
        low_stock_threshold: 5,
      } as any,
      { onConflict: "business_id,id" }
    );

    // Seed a small catalog (fast, realistic enough for a demo)
    const products = [
      { name: "Coca Cola 500ml", category: "Beverages", price: 1.5, cost_price: 1.0, stock_quantity: 30 },
      { name: "Water 1L", category: "Beverages", price: 1.0, cost_price: 0.6, stock_quantity: 40 },
      { name: "Orange Juice", category: "Beverages", price: 2.0, cost_price: 1.2, stock_quantity: 18 },
      { name: "Potato Chips", category: "Snacks", price: 1.2, cost_price: 0.7, stock_quantity: 25 },
      { name: "Chocolate Bar", category: "Snacks", price: 0.9, cost_price: 0.4, stock_quantity: 50 },
      { name: "Bread", category: "Bakery", price: 1.1, cost_price: 0.7, stock_quantity: 22 },
      { name: "Milk 1L", category: "Dairy", price: 1.3, cost_price: 0.9, stock_quantity: 16 },
      { name: "Eggs (12)", category: "Dairy", price: 2.4, cost_price: 1.8, stock_quantity: 12 },
      { name: "USB-C Cable", category: "Accessories", price: 3.5, cost_price: 2.2, stock_quantity: 10 },
      { name: "Phone Charger", category: "Accessories", price: 6.0, cost_price: 3.8, stock_quantity: 8 },
      { name: "Screen Protector", category: "Accessories", price: 2.5, cost_price: 1.0, stock_quantity: 20 },
      { name: "Headphones", category: "Accessories", price: 8.0, cost_price: 5.2, stock_quantity: 6 },
      { name: "SIM Registration", category: "Services", type: "service", price: 1.0, cost_price: 0, stock_quantity: 0 },
      { name: "Phone Cleaning", category: "Services", type: "service", price: 2.0, cost_price: 0, stock_quantity: 0 },
      { name: "Basic Repair Fee", category: "Services", type: "service", price: 5.0, cost_price: 0, stock_quantity: 0 },
    ].map((p) => ({
      business_id,
      name: p.name,
      category: p.category,
      type: (p as any).type || "good",
      price: p.price,
      cost_price: p.cost_price,
      stock_quantity: p.stock_quantity,
      low_stock_threshold: 5,
    }));

    await admin.from("products").insert(products as any);

    // Persist demo session metadata
    const { error: sessErr } = await admin.from("demo_sessions").insert({
      expires_at,
      ip_hash,
      email,
      business_id,
      user_id,
      username,
      user_agent: req.headers.get("user-agent") || null,
    } as any);
    if (sessErr) {
      return json(500, { error: "Failed to record demo session" });
    }

    return json(
      200,
      { username, password, business_id, expires_at },
      { "Cache-Control": "no-store" }
    );
  } catch (e: any) {
    return json(500, { error: "Unhandled error", details: e?.message || String(e) });
  }
});
