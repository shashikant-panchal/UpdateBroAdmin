-- ==============================================================================
-- UPDATE BRO® - Add Multifunctional Widgets Config & Realtime Setup
-- Fully idempotent: safe to execute multiple times in Supabase SQL Editor.
-- ==============================================================================

-- 1. Add widgets_config to store_settings table
alter table public.store_settings add column if not exists widgets_config jsonb default '[]'::jsonb;

-- Initialize default widget configurations if empty
update public.store_settings
set widgets_config = '[
  {
    "id": "hot_deals",
    "title": "Flash Deals & Midnight Steals",
    "subtitle": "Limited-stock performance audio & charging hardware at deep discounts.",
    "badge": "⚡ FLASH SALE",
    "enabled": true,
    "sort_order": 1,
    "timer_enabled": true,
    "timer_hours": 24,
    "discount_badge": "UP TO 60% OFF",
    "product_ids": []
  },
  {
    "id": "new_arrivals",
    "title": "New Arrivals & Fresh Drops",
    "subtitle": "Precision engineered for 2026. Flagship acoustic curve and rapid GaN charging.",
    "badge": "⚡ FRESH DROP",
    "enabled": true,
    "sort_order": 2,
    "product_ids": []
  },
  {
    "id": "featured",
    "title": "Flagship Highlights & Pro Gear",
    "subtitle": "Curated by UPDATE BRO® acoustic and hardware labs for pro users.",
    "badge": "⭐ FLAGSHIP",
    "enabled": true,
    "sort_order": 3,
    "product_ids": []
  },
  {
    "id": "combos",
    "title": "Super Value Combos & Bundles",
    "subtitle": "Pair premium gear together and unlock instant automatic bundle savings.",
    "badge": "🎁 COMBO SAVER",
    "enabled": true,
    "sort_order": 4,
    "discount_badge": "EXTRA 20% OFF",
    "product_ids": []
  }
]'::jsonb
where widgets_config is null or widgets_config = '[]'::jsonb;

-- 2. Add sku, warranty, specs, in_box to products if not yet added
alter table public.products add column if not exists sku text;
alter table public.products add column if not exists warranty text default '1 Year Official Replacement Warranty';
alter table public.products add column if not exists specs jsonb default '[]'::jsonb;
alter table public.products add column if not exists in_box text[] default '{}'::text[];

-- 3. Enable Realtime Replication for instant storefront updates
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.banners;
alter publication supabase_realtime add table public.store_settings;
alter publication supabase_realtime add table public.orders;

-- 4. Notify PostgREST to reload schema cache immediately
notify pgrst, 'reload schema';
