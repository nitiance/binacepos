import { getOrCreateDeviceId } from "@/lib/deviceLicense";
import { resolveTenantScope, tenantScopeKey } from "@/lib/tenantScope";

const DB_NAME = "binancexi_pos_runtime_cache";
const DB_VERSION = 1;
const STORE = "cache";
const LS_PREFIX = "binancexi_runtime_cache_v1";

export const OFFLINE_CACHE_PRODUCTS_KEY = "products";
export const OFFLINE_CACHE_SETTINGS_KEY = "settings";
export const OFFLINE_CACHE_RECEIPTS_KEY = "recent_receipts";

export type OfflineReadinessStatus = "ready" | "stale" | "missing";

type CacheRow<T> = {
  key: string;
  updatedAt: string;
  value: T;
};

export type CachedReceiptItem = {
  product_name: string;
  quantity: number;
  price_at_sale: number;
};

export type CachedReceiptRow = {
  id: string;
  receipt_id: string;
  receipt_number: string;
  customer_name: string | null;
  total_amount: number;
  payment_method: string | null;
  status: string | null;
  created_at: string;
  cashier_name: string;
  order_items: CachedReceiptItem[];
};

function scopePrefix() {
  const scope = resolveTenantScope();
  const scopeKey = tenantScopeKey(scope) || "global";
  const deviceId = getOrCreateDeviceId();
  return `${scopeKey}:device:${deviceId}`;
}

function scopedCacheKey(baseKey: string) {
  return `${scopePrefix()}:${baseKey}`;
}

function lsKey(baseKey: string) {
  return `${LS_PREFIX}:${scopedCacheKey(baseKey)}`;
}

function isIdbAvailable() {
  return typeof indexedDB !== "undefined";
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const result = await fn(store);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    });

    return result;
  } finally {
    db.close();
  }
}

function reqToPromise<T>(req: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB request failed"));
  });
}

export async function writeOfflineSnapshot<T>(baseKey: string, value: T): Promise<void> {
  const key = scopedCacheKey(baseKey);
  const row: CacheRow<T> = {
    key,
    updatedAt: new Date().toISOString(),
    value,
  };

  localStorage.setItem(lsKey(baseKey), JSON.stringify(row));

  if (!isIdbAvailable()) return;
  try {
    await withStore("readwrite", async (store) => {
      store.put(row as any);
    });
  } catch {
    // localStorage fallback already persisted
  }
}

export async function readOfflineSnapshot<T>(baseKey: string): Promise<CacheRow<T> | null> {
  const key = scopedCacheKey(baseKey);

  if (isIdbAvailable()) {
    try {
      const row = await withStore("readonly", async (store) => {
        const res = await reqToPromise(store.get(key));
        return (res as CacheRow<T> | undefined) || null;
      });
      if (row) return row;
    } catch {
      // fallback below
    }
  }

  const fallback = safeJsonParse<CacheRow<T> | null>(localStorage.getItem(lsKey(baseKey)), null);
  return fallback || null;
}

export async function loadCachedProducts<T = any[]>(): Promise<T | null> {
  const row = await readOfflineSnapshot<T>(OFFLINE_CACHE_PRODUCTS_KEY);
  return row?.value ?? null;
}

export async function saveCachedProducts<T = any[]>(products: T): Promise<void> {
  await writeOfflineSnapshot(OFFLINE_CACHE_PRODUCTS_KEY, products);
}

export async function loadCachedSettings<T = Record<string, any>>(): Promise<T | null> {
  const row = await readOfflineSnapshot<T>(OFFLINE_CACHE_SETTINGS_KEY);
  return row?.value ?? null;
}

export async function saveCachedSettings<T = Record<string, any>>(settings: T): Promise<void> {
  await writeOfflineSnapshot(OFFLINE_CACHE_SETTINGS_KEY, settings);
}

export async function loadCachedRecentReceipts(): Promise<CachedReceiptRow[]> {
  const row = await readOfflineSnapshot<CachedReceiptRow[]>(OFFLINE_CACHE_RECEIPTS_KEY);
  return Array.isArray(row?.value) ? row!.value : [];
}

export async function saveCachedRecentReceipts(rows: CachedReceiptRow[]): Promise<void> {
  await writeOfflineSnapshot(OFFLINE_CACHE_RECEIPTS_KEY, rows || []);
}

export async function getOfflineReadiness(
  opts?: { maxAgeMs?: number }
): Promise<{
  status: OfflineReadinessStatus;
  missing: string[];
  stale: string[];
  updatedAt: string | null;
}> {
  const maxAgeMs = Math.max(1, Number(opts?.maxAgeMs ?? 1000 * 60 * 60 * 24));
  const now = Date.now();

  const products = await readOfflineSnapshot(OFFLINE_CACHE_PRODUCTS_KEY);
  const settings = await readOfflineSnapshot(OFFLINE_CACHE_SETTINGS_KEY);

  const required = [
    { key: OFFLINE_CACHE_PRODUCTS_KEY, row: products },
    { key: OFFLINE_CACHE_SETTINGS_KEY, row: settings },
  ];

  const missing = required.filter((r) => !r.row).map((r) => r.key);
  const stale = required
    .filter((r) => {
      if (!r.row?.updatedAt) return false;
      const ts = Date.parse(r.row.updatedAt);
      if (!Number.isFinite(ts)) return true;
      return now - ts > maxAgeMs;
    })
    .map((r) => r.key);

  const updatedAtValues = required
    .map((r) => r.row?.updatedAt || "")
    .filter(Boolean)
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  const updatedAt = updatedAtValues.length ? updatedAtValues[0] : null;

  if (missing.length > 0) {
    return { status: "missing", missing, stale, updatedAt };
  }
  if (stale.length > 0) {
    return { status: "stale", missing, stale, updatedAt };
  }
  return { status: "ready", missing, stale, updatedAt };
}
