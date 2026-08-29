-- ============================================================
-- ARHAT EDIT — Supabase Database Schema
-- Мобайл легендс 1 сарын төлөвлөрт хянасан самбар
-- ============================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Users table (subscribers)
create table public.users (
    id uuid primary key default uuid_generate_v4(),
    email text unique not null,
    phone text,                          -- Монпай тоот
    display_name text,                   -- Хэрэглэгчийн нэр
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- 3. Subscriptions table (main)
create table public.subscriptions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete set null,
    user_email text,                     -- Manual fallback (no FK)
    payment_phone text,                  -- Монпай дугуй (99106925689)
    amount integer default 14999,        -- 14999 төгрөг
    currency text default '₮',
    status text check (status in ('pending', 'active', 'expired', 'cancelled')) default 'pending',
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    notes text                           -- Админ мэдэгдэлүүд
);

-- 4. Indexes for performance
create index idx_subscriptions_status on public.subscriptions(status);
create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_created_at on public.subscriptions(created_at desc);
create index idx_subscriptions_payment_phone on public.subscriptions(payment_phone);

-- 5. Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;

-- Users: users can read own, admin can read all
create policy "Public Access: admin only (service_role bypasses)"
    on public.users for all
    using (auth.role() = 'service_role');

create policy "Users can view own profile"
    on public.users for select
    using (auth.uid() = id);

-- Subscriptions: admin only via service_role
create policy "Admin full access to subscriptions"
    on public.subscriptions for all
    using (auth.role() = 'service_role');

-- 6. Update trigger for updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger set_users_updated_at
    before update on public.users
    for each row execute procedure public.set_updated_at();

create trigger set_subscriptions_updated_at
    before update on public.subscriptions
    for each row execute procedure public.set_updated_at();

-- 7. Helper function: count active subscriptions
create or replace function public.count_active_subscriptions()
returns integer as $$
begin
    return (select count(*) from public.subscriptions where status = 'active');
end;
$$ language plpgsql;
