#!/usr/bin/env node
/**
 * Import/merge products for a business from a QuickBooks-exported CSV.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/import_inventory_from_csv.mjs --csv /path/to/items.csv --business <business_uuid> [--dry-run]
 *
 * The script:
 * - Parses the CSV exported from QuickBooks Item List.
 * - Normalizes fields to the BinanceXI schema.
 * - Matches existing products by barcode, then sku, then name (within the same business).
 * - Upserts via primary key when a match is found; inserts otherwise.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const val = argv[i + 1];
    if (key === '--csv') args.csv = val;
    if (key === '--business') args.business = val;
    if (key === '--dry-run') args.dryRun = true;
  }
  return args;
}

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : fallback;
}

function toInteger(value, fallback = 0) {
  const n = parseInt(String(value).replace(/,/g, '').trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

function toBoolean(value, defaultVal = false) {
  if (value === undefined || value === null) return defaultVal;
  const v = String(value).trim().toLowerCase();
  if (['y', 'yes', 'true', '1', 't'].includes(v)) return true;
  if (['n', 'no', 'false', '0', 'f'].includes(v)) return false;
  return defaultVal;
}

function mapType(raw) {
  const v = String(raw || '').toLowerCase();
  if (v.includes('service')) return 'service';
  return 'good';
}

function pickShortcutCode(record) {
  const keys = Object.keys(record);
  const shortcutKey = keys.find((k) => k.toLowerCase().includes('shortcut') || k.toLowerCase().includes('short code'));
  return shortcutKey ? record[shortcutKey] : undefined;
}

function normalizeRecord(record, businessId) {
  const name = (record.Name || record.Item || '').trim();
  if (!name) return null;

  const barcode = (record.Barcode || record['Barcode #'] || '').trim() || null;
  const sku =
    (record.SKU || record['Manufacturer Part Number'] || record['MPN'] || record['Part Number'] || '').trim() || null;
  const price = toNumber(record.Price ?? record['Sales Price'] ?? record['Price Each'], 0);
  const costPrice = toNumber(record.Cost ?? record['Purchase Cost'] ?? record['Cost Each'], 0);
  const stockQty = toInteger(record['Qty On Hand'] ?? record['On Hand'] ?? record['Quantity'], 0);
  const reorder = toInteger(record['Reorder Point'] ?? record['Reorder'] ?? record['Min'], 5);
  const isActive = toBoolean(record.IsActive ?? record.Active ?? record['Is Active'], true);
  const type = mapType(record.Type ?? record['Item Type']);
  const shortcut = pickShortcutCode(record);

  return {
    business_id: businessId,
    name,
    category: record.Category || null,
    type,
    sku,
    barcode,
    shortcut_code: shortcut || null,
    price,
    cost_price: costPrice,
    stock_quantity: stockQty,
    low_stock_threshold: reorder || 5,
    image_url: null,
    is_variable_price: false,
    requires_note: false,
    is_archived: !isActive,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.csv || !args.business) {
    console.error('Usage: node scripts/import_inventory_from_csv.mjs --csv /path/to/items.csv --business <business_uuid> [--dry-run]');
    process.exit(1);
  }

  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      console.error(`Missing required env ${key}`);
      process.exit(1);
    }
  }

  const csvPath = path.resolve(args.csv);
  const csvRaw = await fs.readFile(csvPath, 'utf8');
  const rows = parse(csvRaw, { columns: true, skip_empty_lines: true });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: existing, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, sku, barcode')
    .eq('business_id', args.business)
    .limit(10000);
  if (fetchErr) {
    console.error('Failed to fetch existing products', fetchErr);
    process.exit(1);
  }

  const byBarcode = new Map();
  const bySku = new Map();
  const byName = new Map();
  for (const p of existing || []) {
    if (p.barcode) byBarcode.set(p.barcode.trim().toLowerCase(), p);
    if (p.sku) bySku.set(p.sku.trim().toLowerCase(), p);
    if (p.name) byName.set(p.name.trim().toLowerCase(), p);
  }

  const payload = [];
  let skipped = 0;
  for (const row of rows) {
    const normalized = normalizeRecord(row, args.business);
    if (!normalized) {
      skipped += 1;
      continue;
    }

    const keyBarcode = normalized.barcode?.toLowerCase();
    const keySku = normalized.sku?.toLowerCase();
    const keyName = normalized.name.toLowerCase();

    let match = null;
    if (keyBarcode && byBarcode.has(keyBarcode)) match = byBarcode.get(keyBarcode);
    else if (keySku && bySku.has(keySku)) match = bySku.get(keySku);
    else if (byName.has(keyName)) match = byName.get(keyName);

    if (match) {
      payload.push({ id: match.id, ...normalized });
    } else {
      payload.push(normalized);
    }
  }

  console.log(`Prepared ${payload.length} rows (skipped ${skipped} empty name rows).`);

  if (args.dryRun) {
    console.log('Dry run only. No data written.');
    return;
  }

  const batchSize = 500;
  for (let i = 0; i < payload.length; i += batchSize) {
    const slice = payload.slice(i, i + batchSize);
    const { error } = await supabase.from('products').upsert(slice, { ignoreDuplicates: false });
    if (error) {
      console.error(`Upsert failed for batch starting at ${i}`, error);
      process.exit(1);
    }
    console.log(`Upserted ${i + slice.length}/${payload.length}`);
  }

  console.log('Import complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
