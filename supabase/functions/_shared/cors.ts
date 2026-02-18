export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
} as const;

export function parseAllowedHosts(raw: string | null) {
  const parts = String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const out = new Set<string>();
  for (const p of parts) {
    try {
      const u = p.includes("://") ? new URL(p) : new URL(`https://${p}`);
      if (u.host) out.add(u.host.toLowerCase());
    } catch {
      // ignore invalid entry
    }
  }

  return out.size > 0 ? out : null;
}

function getOrigin(req: Request) {
  const o = req.headers.get("origin");
  return o ? o.trim() : null;
}

export function corsHeadersAllowlist(req: Request, allowedHosts: Set<string> | null) {
  if (!allowedHosts) return corsHeaders as Record<string, string>;

  // For non-browser clients, Origin may be missing. Don't block those; rate limiting should still apply.
  const origin = getOrigin(req);
  if (!origin) return corsHeaders as Record<string, string>;

  let host: string | null = null;
  try {
    host = new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }

  if (!allowedHosts.has(host)) return null;

  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  } as Record<string, string>;
}

export function json(status: number, body: unknown, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}
