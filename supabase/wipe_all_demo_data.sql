-- ==============================================================================
-- UPDATE BRO® - PURGE ALL DEMO / SAMPLE DATA & AUTO-CONFIRM ADMIN
-- Run this once in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Wipe all order items and orders
truncate table public.order_items cascade;
truncate table public.orders cascade;

-- 2. Wipe all demo products, categories, and hero banners
truncate table public.products cascade;
truncate table public.categories cascade;
truncate table public.banners cascade;

-- 3. Reset store settings to clean empty state
insert into public.store_settings (id, announcement_text, whatsapp_number, shipping_charge, free_shipping_above, cod_enabled)
values (1, '', '', 0, 0, true)
on conflict (id) do update
set
  announcement_text = '',
  whatsapp_number = '',
  shipping_charge = 0,
  free_shipping_above = 0,
  cod_enabled = true;

-- 4. Auto-confirm admin email so login & RLS works seamlessly without email confirmation hurdles
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now()),
    confirmed_at = coalesce(confirmed_at, now())
where lower(email) = 'admin@updatebro.in';

-- 5. Ensure profile is assigned the admin role
insert into public.profiles (id, full_name, email, role)
select id, 'UpdateBro Admin', email, 'admin'
from auth.users
where lower(email) = 'admin@updatebro.in'
on conflict (id) do update set role = 'admin';
