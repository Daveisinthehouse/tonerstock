-- Toner Stock Cloudflare D1 schema
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS toner_items (id TEXT PRIMARY KEY NOT NULL, brand TEXT NOT NULL CHECK (brand IN ('HP','Kyocera')), model TEXT NOT NULL, color TEXT NOT NULL, barcode TEXT, printers TEXT DEFAULT '', quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0), min_threshold INTEGER NOT NULL DEFAULT 1 CHECK (min_threshold >= 0), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE UNIQUE INDEX IF NOT EXISTS toner_items_barcode_unique ON toner_items(barcode) WHERE barcode IS NOT NULL AND barcode <> '';
CREATE INDEX IF NOT EXISTS toner_items_model_idx ON toner_items(model);
CREATE INDEX IF NOT EXISTS toner_items_brand_idx ON toner_items(brand);
CREATE TABLE IF NOT EXISTS stock_events (id INTEGER PRIMARY KEY AUTOINCREMENT, toner_id TEXT NOT NULL REFERENCES toner_items(id) ON DELETE CASCADE, delta INTEGER NOT NULL, event_type TEXT NOT NULL CHECK (event_type IN ('scan','manual_add','manual_remove','undo','import')), barcode TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX IF NOT EXISTS stock_events_toner_idx ON stock_events(toner_id, created_at DESC);
