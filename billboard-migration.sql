/* =========================================================
   GRABZONE BILLBOARD / ANNOUNCEMENT CAROUSEL
   Run this migration once in Supabase SQL Editor.
========================================================= */

create table if not exists public.billboards (
  id uuid primary key default gen_random_uuid(),
  title text,
  eyebrow text,
  message text,
  image_url text not null,
  button_text text default 'Shop Now →',
  link_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billboard_settings (
  id integer primary key default 1,
  autoplay boolean not null default true,
  interval_ms integer not null default 5000,
  transition text not null default 'slide'
    check (transition in ('slide','fade')),
  show_arrows boolean not null default true,
  show_dots boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.billboard_settings(id)
values(1)
on conflict(id) do nothing;

alter table public.billboards enable row level security;
alter table public.billboard_settings enable row level security;

drop policy if exists "public read active billboards" on public.billboards;
create policy "public read active billboards"
on public.billboards for select
using (active = true);

drop policy if exists "authenticated manage billboards" on public.billboards;
create policy "authenticated manage billboards"
on public.billboards for all to authenticated
using (true) with check (true);

drop policy if exists "public read billboard settings" on public.billboard_settings;
create policy "public read billboard settings"
on public.billboard_settings for select
using (true);

drop policy if exists "authenticated manage billboard settings" on public.billboard_settings;
create policy "authenticated manage billboard settings"
on public.billboard_settings for all to authenticated
using (true) with check (true);

grant select on public.billboards to anon;
grant select on public.billboard_settings to anon;
grant select,insert,update,delete on public.billboards to authenticated;
grant select,insert,update,delete on public.billboard_settings to authenticated;

-- Reuse the existing public product-images bucket for billboard uploads.
-- The existing authenticated-upload policy already permits admin uploads.
notify pgrst, 'reload schema';
