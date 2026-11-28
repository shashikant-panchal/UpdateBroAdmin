-- ==============================================================================
-- UPDATE BRO® (UB) - Full E-Commerce Database Schema, RLS & Realtime Setup
-- Fully idempotent: safe to execute multiple times in Supabase SQL Editor.
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "pgcrypto";

-- 2. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text unique,
  shipping_address text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_phone on public.profiles(phone);
create index if not exists idx_profiles_role on public.profiles(role);

-- Helper function to check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where (id = auth.uid() and role = 'admin')
       or lower(coalesce(auth.jwt()->>'email', '')) = 'admin@updatebro.in'
  );
$$;

-- Trigger to create profile upon auth.users signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_meta jsonb;
  v_name text;
  v_phone text;
  v_role text;
begin
  raw_meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name := coalesce(
    raw_meta->>'full_name',
    raw_meta->>'name',
    split_part(coalesce(new.email, ''), '@', 1),
    'UB Customer'
  );
  v_phone := coalesce(new.phone, raw_meta->>'phone');
  
  -- Auto-grant admin role to dedicated master administrator email
  if lower(coalesce(new.email, '')) = 'admin@updatebro.in' then
    v_role := 'admin';
  else
    v_role := coalesce(raw_meta->>'role', 'customer');
  end if;

  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    v_name,
    new.email,
    v_phone,
    v_role
  )
  on conflict (id) do update
  set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    phone = coalesce(public.profiles.phone, excluded.phone),
    role = case
      when lower(coalesce(excluded.email, '')) = 'admin@updatebro.in' then 'admin'
      else public.profiles.role
    end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. CATEGORIES TABLE
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_slug on public.categories(slug);
create index if not exists idx_categories_active_sort on public.categories(is_active, sort_order);

-- 4. BANNERS TABLE
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  cta_text text not null default 'Shop Now',
  cta_link text not null default '/shop',
  image_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  video_url text,
  poster_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_banners_active_sort on public.banners(is_active, sort_order);

-- 5. PRODUCTS TABLE
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(10,2) not null,
  compare_at_price numeric(10,2),
  category_id uuid references public.categories(id) on delete set null,
  images text[] not null default '{}'::text[],
  highlights text[] not null default '{}'::text[],
  in_stock boolean not null default true,
  stock_quantity int not null default 50,
  is_featured boolean not null default false,
  is_best_seller boolean not null default false,
  is_new_arrival boolean not null default false,
  is_combo boolean not null default false,
  created_at timestamptz not null default now()
);

-- Ensure columns exist if table was already created
alter table public.products add column if not exists is_best_seller boolean not null default false;
alter table public.products add column if not exists is_new_arrival boolean not null default false;
alter table public.products add column if not exists is_combo boolean not null default false;
alter table public.products add column if not exists stock_quantity int not null default 50;

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_featured on public.products(is_featured);
create index if not exists idx_products_best_seller on public.products(is_best_seller);
create index if not exists idx_products_new_arrival on public.products(is_new_arrival);
create index if not exists idx_products_combo on public.products(is_combo);
create index if not exists idx_products_in_stock on public.products(in_stock);

-- 6. ORDER NUMBER SEQUENCE & GENERATOR
create sequence if not exists public.order_number_seq start with 1001 increment by 1;

-- 7. ORDERS TABLE
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  shipping_address text not null,
  payment_method text not null default 'COD',
  subtotal numeric(10,2) not null default 0,
  shipping_fee numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null,
  status text not null default 'Pending' check (status in ('Pending', 'Confirmed', 'Processing', 'Dispatched', 'Delivered', 'Cancelled')),
  status_history jsonb not null default '[]'::jsonb,
  tracking_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_customer_phone on public.orders(customer_phone);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

-- 8. ORDER ITEMS TABLE
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_image text,
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- 9. PRODUCT REVIEWS TABLE
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  rating int not null check (rating >= 1 and rating <= 5),
  title text,
  comment text not null,
  verified_purchase boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.product_reviews add column if not exists order_id uuid references public.orders(id) on delete set null;
alter table public.product_reviews add column if not exists customer_phone text;
alter table public.product_reviews add column if not exists verified_purchase boolean not null default true;

create index if not exists idx_product_reviews_product_id on public.product_reviews(product_id);
create index if not exists idx_product_reviews_user_id on public.product_reviews(user_id);
create index if not exists idx_product_reviews_order_id on public.product_reviews(order_id);
create index if not exists idx_product_reviews_created on public.product_reviews(created_at desc);

-- 10. ORDER STATUS HISTORY & TIMESTAMPS TRIGGER
create or replace function public.handle_order_status_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT') then
    if new.order_number is null or new.order_number = '' then
      new.order_number := 'UB-' || nextval('public.order_number_seq');
    end if;

    if new.status_history is null or jsonb_array_length(new.status_history) = 0 then
      new.status_history := jsonb_build_array(
        jsonb_build_object(
          'status', new.status,
          'timestamp', now(),
          'note', coalesce(new.tracking_note, 'Order placed successfully')
        )
      );
    end if;
    new.updated_at := now();
  elsif (TG_OP = 'UPDATE' and old.status is distinct from new.status) then
    new.status_history := coalesce(old.status_history, '[]'::jsonb) || jsonb_build_object(
      'status', new.status,
      'timestamp', now(),
      'note', coalesce(new.tracking_note, 'Status updated to ' || new.status)
    );
    new.updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists tr_order_status_update on public.orders;
create trigger tr_order_status_update
  before insert or update on public.orders
  for each row execute function public.handle_order_status_update();

-- 10. LINK PAST ORDERS BY PHONE NUMBER
create or replace function public.link_past_orders_by_phone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.phone is not null and (TG_OP = 'INSERT' or old.phone is distinct from new.phone) then
    update public.orders
    set user_id = new.id
    where customer_phone = new.phone
      and user_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_link_past_orders on public.profiles;
create trigger tr_link_past_orders
  after insert or update of phone on public.profiles
  for each row execute function public.link_past_orders_by_phone();

-- 11. CUSTOMER ORDER CANCELLATION RPC
create or replace function public.cancel_customer_order(
  p_order_id uuid,
  p_reason text default 'Cancelled by customer'
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_user_id uuid := (select auth.uid());
  v_user_phone text;
  v_is_authorized boolean := false;
  v_clean_reason text;
begin
  if v_user_id is null then
    raise exception 'Authentication required to cancel order';
  end if;

  select phone into v_user_phone from public.profiles where id = v_user_id;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  -- Check ownership or admin
  if public.is_admin()
     or v_order.user_id = v_user_id
     or (v_user_phone is not null and v_order.customer_phone = v_user_phone) then
    v_is_authorized := true;
  end if;

  if not v_is_authorized then
    raise exception 'You do not have permission to cancel this order';
  end if;

  -- Check cancellation eligibility
  if v_order.status not in ('Pending', 'Confirmed', 'Processing') then
    raise exception 'Orders in % status cannot be cancelled', v_order.status;
  end if;

  v_clean_reason := coalesce(nullif(trim(p_reason), ''), 'Cancelled by customer');

  update public.orders
  set
    status = 'Cancelled',
    tracking_note = v_clean_reason,
    updated_at = now()
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.cancel_customer_order(uuid, text) to authenticated;

-- 12. STORE SETTINGS SINGLETON TABLE
create table if not exists public.store_settings (
  id int primary key default 1 check (id = 1),
  announcement_text text not null default '',
  whatsapp_number text not null default '',
  shipping_charge numeric(10,2) not null default 0,
  free_shipping_above numeric(10,2) not null default 0,
  cod_enabled boolean not null default true
);

-- Initialize empty store settings row
insert into public.store_settings (id, announcement_text, whatsapp_number, shipping_charge, free_shipping_above, cod_enabled)
values (1, '', '', 0, 0, true)
on conflict (id) do nothing;

-- 12. ROW-LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.banners enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.store_settings enable row level security;

-- PROFILES POLICIES
drop policy if exists "Profiles are viewable by owner or admin" on public.profiles;
create policy "Profiles are viewable by owner or admin"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id or public.is_admin() );

drop policy if exists "Profiles can be updated by owner or admin" on public.profiles;
create policy "Profiles can be updated by owner or admin"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id or public.is_admin() )
  with check ( (select auth.uid()) = id or public.is_admin() );

-- CATEGORIES POLICIES
drop policy if exists "Active categories are publicly viewable" on public.categories;
create policy "Active categories are publicly viewable"
  on public.categories for select
  to public
  using ( is_active = true or public.is_admin() );

drop policy if exists "Categories are editable only by admin" on public.categories;
create policy "Categories are editable only by admin"
  on public.categories for all
  to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- BANNERS POLICIES
drop policy if exists "Active banners are publicly viewable" on public.banners;
create policy "Active banners are publicly viewable"
  on public.banners for select
  to public
  using ( is_active = true or public.is_admin() );

drop policy if exists "Banners are editable only by admin" on public.banners;
create policy "Banners are editable only by admin"
  on public.banners for all
  to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- PRODUCTS POLICIES
drop policy if exists "Products are publicly viewable" on public.products;
create policy "Products are publicly viewable"
  on public.products for select
  to public
  using ( in_stock = true or public.is_admin() );

drop policy if exists "Products are editable only by admin" on public.products;
create policy "Products are editable only by admin"
  on public.products for all
  to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- ORDERS POLICIES
drop policy if exists "Users can view their own orders or admin" on public.orders;
create policy "Users can view their own orders or admin"
  on public.orders for select
  to authenticated
  using (
    (user_id is not null and (select auth.uid()) = user_id)
    or (customer_phone in (select phone from public.profiles where id = (select auth.uid())))
    or public.is_admin()
  );

drop policy if exists "Anyone can insert an order" on public.orders;
create policy "Anyone can insert an order"
  on public.orders for insert
  to public
  with check ( true );

drop policy if exists "Only admin can update or delete orders" on public.orders;
drop policy if exists "Admin or owner can update order" on public.orders;
create policy "Admin or owner can update order"
  on public.orders for update
  to authenticated
  using (
    public.is_admin()
    or (
      (
        (user_id is not null and (select auth.uid()) = user_id)
        or (customer_phone in (select phone from public.profiles where id = (select auth.uid())))
      )
      and status in ('Pending', 'Confirmed', 'Processing')
    )
  )
  with check (
    public.is_admin()
    or (
      (
        (user_id is not null and (select auth.uid()) = user_id)
        or (customer_phone in (select phone from public.profiles where id = (select auth.uid())))
      )
      and status = 'Cancelled'
    )
  );

drop policy if exists "Only admin can delete orders" on public.orders;
create policy "Only admin can delete orders"
  on public.orders for delete
  to authenticated
  using ( public.is_admin() );

-- ORDER ITEMS POLICIES
drop policy if exists "Users can view items of their orders or admin" on public.order_items;
create policy "Users can view items of their orders or admin"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (
          (o.user_id is not null and o.user_id = (select auth.uid()))
          or (o.customer_phone in (select phone from public.profiles where id = (select auth.uid())))
          or public.is_admin()
        )
    )
  );

drop policy if exists "Anyone can insert order items" on public.order_items;
create policy "Anyone can insert order items"
  on public.order_items for insert
  to public
  with check ( true );

drop policy if exists "Only admin can update or delete order items" on public.order_items;
create policy "Only admin can update or delete order items"
  on public.order_items for all
  to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- STORE SETTINGS POLICIES
drop policy if exists "Store settings are publicly viewable" on public.store_settings;
create policy "Store settings are publicly viewable"
  on public.store_settings for select
  to public
  using ( true );

drop policy if exists "Store settings are editable only by admin" on public.store_settings;
create policy "Store settings are editable only by admin"
  on public.store_settings for update
  to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- PRODUCT REVIEWS POLICIES
alter table public.product_reviews enable row level security;

drop policy if exists "Reviews are publicly viewable" on public.product_reviews;
create policy "Reviews are publicly viewable"
  on public.product_reviews for select
  to public
  using ( true );

drop policy if exists "Authenticated users can submit reviews" on public.product_reviews;
create policy "Authenticated users can submit reviews"
  on public.product_reviews for insert
  to authenticated
  with check (
    public.is_admin() or (select auth.uid()) = user_id
  );

drop policy if exists "Admins can delete reviews" on public.product_reviews;
create policy "Admins can delete reviews"
  on public.product_reviews for delete
  to authenticated
  using ( public.is_admin() );

drop policy if exists "Admins or authors can update reviews" on public.product_reviews;
create policy "Admins or authors can update reviews"
  on public.product_reviews for update
  to authenticated
  using ( public.is_admin() or (select auth.uid()) = user_id )
  with check ( public.is_admin() or (select auth.uid()) = user_id );

-- 13. REALTIME PUBLICATION SETUP
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders;
    alter publication supabase_realtime add table public.products;
    alter publication supabase_realtime add table public.categories;
    alter publication supabase_realtime add table public.banners;
    alter publication supabase_realtime add table public.store_settings;
    alter publication supabase_realtime add table public.product_reviews;
  end if;
exception when others then
  -- ignore error if tables are already in publication
end $$;

-- 14. REALTIME PUBLICATION SETUP COMPLETE
-- All tables and schemas created cleanly with zero demo or sample rows.
