-- GrabZone admin ownership + commission accounting
alter table public.referral_codes
  add column if not exists owner_name text,
  add column if not exists commission_type text not null default 'percentage',
  add column if not exists commission_value numeric(12,2) not null default 0;

alter table public.referral_codes
  drop constraint if exists referral_codes_commission_type_check;

alter table public.referral_codes
  add constraint referral_codes_commission_type_check
  check (commission_type in ('percentage','fixed'));

alter table public.referral_codes
  drop constraint if exists referral_codes_commission_value_nonnegative;

alter table public.referral_codes
  add constraint referral_codes_commission_value_nonnegative
  check (commission_value >= 0);
