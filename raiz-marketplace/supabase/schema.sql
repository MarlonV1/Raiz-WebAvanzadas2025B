create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create schema if not exists profile;
create schema if not exists product;
create schema if not exists "order";
create schema if not exists message;
create schema if not exists audit;
create table profile.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  role text not null default 'user'
    check (role in ('user', 'farmer', 'admin')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profile.profiles enable row level security;
create policy "Users can view own profile"
on profile.profiles
for select
using (auth.uid() = id);

create policy "Users can update own profile"
on profile.profiles
for update
using (auth.uid() = id);

create policy "Users can insert own profile"
on profile.profiles
for insert
with check (auth.uid() = id);

create table product.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null
    references profile.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text,
  price numeric(12,2) not null check (price >= 0),
  quantity int not null default 0 check (quantity >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table product.products enable row level security;
create policy "Public can view active products"
on product.products
for select
using (is_active = true);

create policy "Users can create own products"
on product.products
for insert
with check (auth.uid() = owner_id);

create policy "Users can update own products"
on product.products
for update
using (auth.uid() = owner_id);

create policy "Users can delete own products"
on product.products
for delete
using (auth.uid() = owner_id);

create table "order".orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null
    references profile.profiles(id),
  seller_id uuid not null
    references profile.profiles(id),
  product_id uuid not null
    references product.products(id),
  quantity int not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  total numeric(12,2) not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table "order".orders enable row level security;
create policy "Buyers and sellers can view orders"
on "order".orders
for select
using (
  auth.uid() = buyer_id
  or auth.uid() = seller_id
);

create policy "Buyers can create orders"
on "order".orders
for insert
with check (auth.uid() = buyer_id);

create policy "Buyers and sellers can update orders"
on "order".orders
for update
using (
  auth.uid() = buyer_id
  or auth.uid() = seller_id
);

create table message.messages (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null
    references profile.profiles(id) on delete cascade,
  to_user_id uuid not null
    references profile.profiles(id) on delete cascade,
  message_text text not null,
  is_read boolean default false,
  sent_at timestamptz default now()
);

alter table message.messages enable row level security;
create policy "Users can view own messages"
on message.messages
for select
using (
  auth.uid() = from_user_id
  or auth.uid() = to_user_id
);

create policy "Users can send messages"
on message.messages
for insert
with check (auth.uid() = from_user_id);

create policy "Recipients can update messages"
on message.messages
for update
using (auth.uid() = to_user_id);

create table audit.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profile.profiles(id),
  entity text not null,
  entity_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

alter table audit.audit_logs enable row level security;
create policy "Admins can view audit logs"
on audit.audit_logs
for select
using (
  exists (
    select 1
    from profile.profiles
    where id = auth.uid()
    and role = 'admin'
  )
);

create policy "Service role can insert audit logs"
on audit.audit_logs
for insert
with check (true);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
before update on profile.profiles
for each row execute function update_updated_at_column();

create trigger update_products_updated_at
before update on product.products
for each row execute function update_updated_at_column();

create trigger update_orders_updated_at
before update on "order".orders
for each row execute function update_updated_at_column();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into profile.profiles (id, username, full_name, role)
  values (
    new.id,
    split_part(new.email, '@', 1),
    '',
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

select schemaname, tablename, policyname
from pg_policies
order by schemaname, tablename;
