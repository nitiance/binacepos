import type { ReceiptStoreSettings } from "@/core/receipts/receiptPrintModel";
import { getOrCreateDeviceId } from "@/lib/deviceLicense";
import {
  getTenantScopeFromLocalUser,
  readScopedJSON,
  readScopedString,
  writeScopedJSON,
  writeScopedString,
} from "@/lib/tenantScope";

const LEGACY_KEY = "binancexi_thermal_print_queue_v1";
const KEY_PREFIX = "binancexi_thermal_print_queue_v2";
const MIGRATION_MARKER_KEY = "binancexi_thermal_print_queue_v2_migrated";

export type ThermalJob = {
  jobId: string;
  queuedAt: string;
  receiptId?: string;
  receiptNumber: string;
  timestamp: string;
  cashierName: string;
  customerName: string;
  paymentMethod: string;
  cart: any[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  activeDiscountName?: string | null;
  taxRatePct?: number | null;
  settings?: ReceiptStoreSettings | null;
};

type ThermalJobInput = Omit<ThermalJob, "jobId" | "queuedAt"> & {
  jobId?: string;
  queuedAt?: string;
};

function createJobId() {
  // @ts-ignore
  return globalThis.crypto?.randomUUID?.() || `print-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function queueBaseKey() {
  return `${KEY_PREFIX}:${getOrCreateDeviceId()}`;
}

function normalizeJob(raw: any): ThermalJob {
  return {
    jobId: String(raw?.jobId || "").trim() || createJobId(),
    queuedAt: String(raw?.queuedAt || "").trim() || new Date().toISOString(),
    receiptId: raw?.receiptId ? String(raw.receiptId) : undefined,
    receiptNumber: String(raw?.receiptNumber || ""),
    timestamp: String(raw?.timestamp || new Date().toISOString()),
    cashierName: String(raw?.cashierName || "Staff"),
    customerName: String(raw?.customerName || ""),
    paymentMethod: String(raw?.paymentMethod || "cash"),
    cart: Array.isArray(raw?.cart) ? raw.cart : [],
    subtotal: Number(raw?.subtotal || 0),
    discount: Number(raw?.discount || 0),
    tax: Number(raw?.tax || 0),
    total: Number(raw?.total || 0),
    activeDiscountName: raw?.activeDiscountName ?? null,
    taxRatePct: raw?.taxRatePct ?? null,
    settings: raw?.settings ?? null,
  };
}

function readLegacyQueue(): ThermalJob[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeJob) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: ThermalJob[]) {
  writeScopedJSON(queueBaseKey(), queue, { scope: getTenantScopeFromLocalUser() });
}

function ensureMigrated() {
  const marker = readScopedString(MIGRATION_MARKER_KEY, "", {
    scope: getTenantScopeFromLocalUser(),
    migrateLegacy: false,
  });
  if (marker === "1") return;

  const baseKey = queueBaseKey();
  const existing = readScopedJSON<ThermalJob[]>(baseKey, [], {
    scope: getTenantScopeFromLocalUser(),
    migrateLegacy: false,
  });
  if (existing.length > 0) {
    try {
      writeScopedString(MIGRATION_MARKER_KEY, "1", { scope: getTenantScopeFromLocalUser() });
    } catch {
      // ignore
    }
    return;
  }

  const legacy = readLegacyQueue();
  if (legacy.length > 0) {
    writeQueue(legacy);
  }
  try {
    writeScopedString(MIGRATION_MARKER_KEY, "1", { scope: getTenantScopeFromLocalUser() });
  } catch {
    // ignore
  }
}

function readQueue(): ThermalJob[] {
  ensureMigrated();
  const queue = readScopedJSON<ThermalJob[]>(queueBaseKey(), [], {
    scope: getTenantScopeFromLocalUser(),
    migrateLegacy: false,
  });
  if (!Array.isArray(queue)) return [];
  return queue.map(normalizeJob);
}

export function enqueueThermalJob(job: ThermalJobInput): ThermalJob {
  const normalized = normalizeJob(job);
  const queue = readQueue();
  queue.push(normalized);
  writeQueue(queue);
  return normalized;
}

export function getThermalQueue(): ThermalJob[] {
  return readQueue();
}

export function clearThermalQueue() {
  writeQueue([]);
}

export function removeThermalJob(jobId: string) {
  const id = String(jobId || "").trim();
  if (!id) return;
  const next = readQueue().filter((job) => job.jobId !== id);
  writeQueue(next);
}
