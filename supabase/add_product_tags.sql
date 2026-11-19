-- ==============================================================================
-- ADD BEST SELLERS, NEW ARRIVALS & COMBOS COLUMNS TO PRODUCTS
-- Run this once in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

alter table public.products add column if not exists is_best_seller boolean not null default false;
alter table public.products add column if not exists is_new_arrival boolean not null default false;
alter table public.products add column if not exists is_combo boolean not null default false;

create index if not exists idx_products_best_seller on public.products(is_best_seller);
create index if not exists idx_products_new_arrival on public.products(is_new_arrival);
create index if not exists idx_products_combo on public.products(is_combo);
