export function isDemoEntry(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("demo") === "1";
  } catch {
    return false;
  }
}

export function demoEntryPath(): string {
  return "/?demo=1";
}

