-- Toner Stock shared database schema (Supabase/Postgres)
create table if not exists toner_items (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (brand in ('HP','Kyocera')),
  model text not null,
  color text not null,
  barcode text,
  printers text,
  quantity integer not null default 0 check (quantity >= 0),
  min_threshold integer not null default 1 check (min_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists toner_items_barcode_unique on toner_items(barcode) where barcode is not null and barcode <> '';
create index if not exists toner_items_model_idx on toner_items(model);
create index if not exists toner_items_brand_idx on toner_items(brand);

create table if not exists stock_events (
  id bigint generated always as identity primary key,
  toner_id uuid not null references toner_items(id) on delete cascade,
  delta integer not null,
  event_type text not null check (event_type in ('scan','manual_add','manual_remove','undo','import')),
  barcode text,
  created_at timestamptz not null default now()
);
create index if not exists stock_events_toner_idx on stock_events(toner_id, created_at desc);

alter table toner_items enable row level security;
alter table stock_events enable row level security;

-- For the first private/internal version, create authenticated-user policies in Supabase.
-- Do not use a service-role key in the browser.
create policy if not exists toner_items_authenticated_select on toner_items for select to authenticated using (true);
create policy if not exists toner_items_authenticated_insert on toner_items for insert to authenticated with check (true);
create policy if not exists toner_items_authenticated_update on toner_items for update to authenticated using (true) with check (true);
create policy if not exists toner_items_authenticated_delete on toner_items for delete to authenticated using (true);
create policy if not exists stock_events_authenticated_select on stock_events for select to authenticated using (true);
create policy if not exists stock_events_authenticated_insert on stock_events for insert to authenticated with check (true);
