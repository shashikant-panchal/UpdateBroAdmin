-- ==============================================================================
-- UPDATE BRO® - Add Tagline, Product SKU, Technical Specs & Warranty Support
-- Fully idempotent: safe to execute multiple times in Supabase SQL Editor.
-- ==============================================================================

-- 1. Add tagline to store_settings table
alter table public.store_settings add column if not exists tagline text not null default 'Power Your World';

-- Update existing row if tagline is empty
update public.store_settings
set tagline = 'Power Your World'
where tagline is null or tagline = '';

-- Ensure admin can also insert store_settings if row 1 is ever missing
drop policy if exists "Store settings are insertable only by admin" on public.store_settings;
create policy "Store settings are insertable only by admin"
  on public.store_settings for insert
  to authenticated
  with check ( public.is_admin() );

-- 2. Add sku, warranty, specs, in_box to products table
alter table public.products add column if not exists sku text;
alter table public.products add column if not exists warranty text default '1 Year Official Replacement Warranty';
alter table public.products add column if not exists specs jsonb default '[]'::jsonb;
alter table public.products add column if not exists in_box text[] default '{}'::text[];

-- Create index on sku for rapid lookups
create index if not exists idx_products_sku on public.products(sku);

-- 3. Notify PostgREST to reload schema cache immediately
notify pgrst, 'reload schema';
