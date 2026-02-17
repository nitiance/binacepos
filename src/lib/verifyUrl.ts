const DEFAULT_PUBLIC_APP_URL = "https://binacepos.vercel.app";

function hasScheme(raw: string) {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw);
}

function isLikelyLocalhost(hostname: string) {
  const h = (hostname || "").trim().toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0";
}

export function normalizeBaseUrl(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;

  // Auto-prefix scheme for convenience ("example.com" -> "https://example.com")
  const candidate = hasScheme(trimmed) ? trimmed : `https://${trimmed}`;

  // Strip fragment early so URL parsing doesn't keep it around.
  const noHash = candidate.split("#")[0];

  try {
    const u = new URL(noHash);
    const proto = u.protocol.toLowerCase();
    if (proto !== "http:" && proto !== "https:") return null;

    u.search = "";
    u.hash = "";

    const path = u.pathname.replace(/\/+$/, "");
    const basePath = path === "/" ? "" : path;
    return `${u.origin}${basePath}`;
  } catch {
    const fallback = noHash.replace(/\/+$/, "");
    if (/^https?:\/\//i.test(fallback)) return fallback;
    return null;
  }
}

export function getConfiguredPublicAppUrl(): string | null {
  const raw = (import.meta as any)?.env?.VITE_PUBLIC_APP_URL;
  return normalizeBaseUrl(typeof raw === "string" ? raw : null);
}

function isUnsafePublicBase(base: string) {
  // In production builds, never emit localhost verification links. This is common in
  // Capacitor/Tauri where the webview origin is "http://localhost" / "tauri://localhost".
  const isProd = !!(import.meta as any)?.env?.PROD;
  if (!isProd) return false;

  try {
    const u = new URL(base);
    return isLikelyLocalhost(u.hostname);
  } catch {
    return false;
  }
}

export function resolveVerifyBaseUrl(baseUrl?: string | null): string {
  const fromEnv = getConfiguredPublicAppUrl();
  if (fromEnv && !isUnsafePublicBase(fromEnv)) return fromEnv;

  const fromArg = normalizeBaseUrl(baseUrl);
  if (fromArg && !isUnsafePublicBase(fromArg)) return fromArg;

  const fromWindow =
    typeof window !== "undefined" && (window as any)?.location?.origin
      ? normalizeBaseUrl(window.location.origin)
      : null;
  if (fromWindow && !isUnsafePublicBase(fromWindow)) return fromWindow;

  return DEFAULT_PUBLIC_APP_URL;
}

export function buildVerifyUrl(baseUrl: string | null | undefined, receiptId: string) {
  const base = resolveVerifyBaseUrl(baseUrl).replace(/\/+$/, "");
  const rid = encodeURIComponent(String(receiptId || "").trim());
  return `${base}/#/verify/${rid}`;
}
