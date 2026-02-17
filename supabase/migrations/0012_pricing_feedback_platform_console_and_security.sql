-- BinanceXI POS — pricing plans + feedback + platform console RPCs + soft-delete + security hardening

begin;

/* -------------------------------------------------------------------------- */
/* pricing_plans (global, public-readable)                                    */
/* -------------------------------------------------------------------------- */

create table if not exists public.pricing_plans (
  plan_type text primary key,
  included_devices integer not null default 2 check (included_devices >= 1 and included_devices <= 50),
  setup_base numeric not null check (setup_base >= 0),
  setup_per_extra numeric not null default 5 check (setup_per_extra >= 0),
  monthly_base numeric not null check (monthly_base >= 0),
  monthly_per_extra numeric not null default 5 check (monthly_per_extra >= 0),
  annual_base numeric not null default 50 check (annual_base >= 0),
  annual_months integer not null default 12 check (annual_months >= 1 and annual_months <= 36),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pricing_plans_plan_type_check') then
    alter table public.pricing_plans
      add constraint pricing_plans_plan_type_check
      check (plan_type in ('business_system','app_only'));
  end if;
end $$;

drop trigger if exists set_updated_at_pricing_plans on public.pricing_plans;
create trigger set_updated_at_pricing_plans
before update on public.pricing_plans
for each row execute function public.set_updated_at();

-- Seed defaults (editable via platform admin UI)
insert into public.pricing_plans (
  plan_type,
  included_devices,
  setup_base,
  setup_per_extra,
  monthly_base,
  monthly_per_extra,
  annual_base,
  annual_months
) values
  ('business_system', 2, 40, 5, 5, 5, 50, 12),
  ('app_only',       2, 10, 5, 5, 5, 50, 12)
on conflict (plan_type) do update
  set included_devices = excluded.included_devices,
      setup_base = excluded.setup_base,
      setup_per_extra = excluded.setup_per_extra,
      monthly_base = excluded.monthly_base,
      monthly_per_extra = excluded.monthly_per_extra,
      annual_base = excluded.annual_base,
      annual_months = excluded.annual_months;

alter table public.pricing_plans enable row level security;

drop policy if exists pricing_plans_read on public.pricing_plans;
create policy pricing_plans_read
on public.pricing_plans
for select
to anon, authenticated
using (true);

drop policy if exists pricing_plans_write_platform on public.pricing_plans;
create policy pricing_plans_write_platform
on public.pricing_plans
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

/* -------------------------------------------------------------------------- */
/* app_feedback (bug reports / feature requests / reviews)                    */
/* -------------------------------------------------------------------------- */

create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid null references public.profiles (id) on delete set null,
  type text not null,
  rating integer null,
  title text not null,
  message text not null,
  severity text not null default 'low',
  status text not null default 'new',
  app_version text null,
  platform text null,
  route text null,
  metadata jsonb null
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_feedback_type_check') then
    alter table public.app_feedback
      add constraint app_feedback_type_check
      check (type in ('bug','feature','review'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'app_feedback_severity_check') then
    alter table public.app_feedback
      add constraint app_feedback_severity_check
      check (severity in ('low','medium','high'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'app_feedback_status_check') then
    alter table public.app_feedback
      add constraint app_feedback_status_check
      check (status in ('new','triaged','in_progress','done','wont_fix'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'app_feedback_rating_check') then
    alter table public.app_feedback
      add constraint app_feedback_rating_check
      check (
        (type = 'review' and rating is not null and rating >= 1 and rating <= 5)
        or (type <> 'review' and rating is null)
      );
  end if;
end $$;

create index if not exists app_feedback_business_created_idx on public.app_feedback (business_id, created_at desc);
create index if not exists app_feedback_status_created_idx on public.app_feedback (status, created_at desc);

alter table public.app_feedback enable row level security;

drop policy if exists app_feedback_insert_self on public.app_feedback;
create policy app_feedback_insert_self
on public.app_feedback
for insert
to authenticated
with check (
  business_id = public.current_business_id()
  and user_id = auth.uid()
);

drop policy if exists app_feedback_select_scope on public.app_feedback;
create policy app_feedback_select_scope
on public.app_feedback
for select
to authenticated
using (
  public.is_platform_admin()
  or business_id = public.current_business_id()
);

drop policy if exists app_feedback_update_platform on public.app_feedback;
create policy app_feedback_update_platform
on public.app_feedback
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists app_feedback_delete_platform on public.app_feedback;
create policy app_feedback_delete_platform
on public.app_feedback
for delete
to authenticated
using (public.is_platform_admin());

/* -------------------------------------------------------------------------- */
/* businesses: soft-delete metadata                                           */
/* -------------------------------------------------------------------------- */

alter table if exists public.businesses
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_reason text null,
  add column if not exists deleted_by uuid null references public.profiles (id);

create index if not exists businesses_deleted_at_idx on public.businesses (deleted_at);

/* -------------------------------------------------------------------------- */
/* billing_payments: allow annual kind                                        */
/* -------------------------------------------------------------------------- */

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'billing_payments_kind_check') then
    alter table public.billing_payments drop constraint billing_payments_kind_check;
  end if;

  alter table public.billing_payments
    add constraint billing_payments_kind_check
    check (kind in ('setup','subscription','annual','reactivation','manual'));
end $$;

/* -------------------------------------------------------------------------- */
/* businesses_create_billing_row: app_only base includes 2 devices             */
/* -------------------------------------------------------------------------- */

create or replace function public.businesses_create_billing_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text := coalesce(nullif(trim(new.plan_type), ''), 'business_system');
  v_grace integer := case when v_plan = 'app_only' then 5 else 7 end;
  -- Pricing model changed: both plans include 2 devices by default.
  v_max integer := 2;
  -- Trial: app_only starts with 30 days paid-through; business_system starts at "now" (grace applies).
  v_paid timestamptz := case when v_plan = 'app_only' then (now() + interval '30 days') else now() end;
begin
  insert into public.business_billing (business_id, grace_days, max_devices, paid_through)
  values (new.id, v_grace, v_max, v_paid)
  on conflict (business_id) do nothing;
  return new;
end;
$$;

/* -------------------------------------------------------------------------- */
/* SECURITY: Harden stock RPCs for multi-tenant isolation                      */
/* -------------------------------------------------------------------------- */

create or replace function public.decrement_stock(p_product_id uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  if p_qty is null or p_qty <= 0 then
    return;
  end if;

  if not exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.active is distinct from false
  ) then
    raise exception 'Not authorized';
  end if;

  v_business_id := public.current_business_id();
  if v_business_id is null then
    raise exception 'Missing business context';
  end if;

  update public.products
    set stock_quantity = greatest(0, stock_quantity - p_qty),
        updated_at = now()
    where id = p_product_id
      and business_id = v_business_id;
end;
$$;

create or replace function public.increment_stock(p_product_id uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  if p_qty is null or p_qty <= 0 then
    return;
  end if;

  if not exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.active is distinct from false
      and (
        me.role = 'admin'
        or coalesce((me.permissions ->> 'allowVoid')::boolean, false) = true
        or coalesce((me.permissions ->> 'allowRefunds')::boolean, false) = true
      )
  ) then
    raise exception 'Not authorized';
  end if;

  v_business_id := public.current_business_id();
  if v_business_id is null then
    raise exception 'Missing business context';
  end if;

  update public.products
    set stock_quantity = stock_quantity + p_qty,
        updated_at = now()
    where id = p_product_id
      and business_id = v_business_id;
end;
$$;

revoke all on function public.decrement_stock(uuid, integer) from public;
revoke all on function public.increment_stock(uuid, integer) from public;
grant execute on function public.decrement_stock(uuid, integer) to authenticated;
grant execute on function public.increment_stock(uuid, integer) to authenticated;

/* -------------------------------------------------------------------------- */
/* Platform RPCs: KPI + Tenant Health + Soft Delete                            */
/* -------------------------------------------------------------------------- */

create or replace function public.platform_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_30d timestamptz := v_now - interval '30 days';
  v_7d timestamptz := v_now - interval '7 days';

  v_total_businesses int := 0;
  v_active_businesses int := 0;
  v_suspended_businesses int := 0;
  v_locked int := 0;
  v_grace int := 0;

  v_payments_total numeric := 0;
  v_payments_count int := 0;

  v_orders_count int := 0;
  v_orders_total numeric := 0;

  v_feedback_new int := 0;
  v_feedback_open int := 0;

  v_active_devices int := 0;
  v_seen_24h int := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_platform_admin(v_uid) then
    raise exception 'Not authorized';
  end if;

  select count(*)::int into v_total_businesses from public.businesses;
  select count(*)::int into v_active_businesses from public.businesses where status = 'active';
  select count(*)::int into v_suspended_businesses from public.businesses where status = 'suspended';

  -- Access state counts
  with s as (
    select
      b.id,
      b.status,
      bb.paid_through,
      bb.grace_days,
      bb.locked_override,
      case
        when b.status = 'suspended' or bb.locked_override = true then 'locked'
        when v_now <= bb.paid_through then 'active'
        when v_now <= (bb.paid_through + make_interval(days => bb.grace_days)) then 'grace'
        else 'locked'
      end as access_state
    from public.businesses b
    left join public.business_billing bb on bb.business_id = b.id
  )
  select
    sum(case when access_state = 'locked' then 1 else 0 end)::int,
    sum(case when access_state = 'grace' then 1 else 0 end)::int
  into v_locked, v_grace
  from s;

  select
    coalesce(sum(amount), 0),
    count(*)::int
  into v_payments_total, v_payments_count
  from public.billing_payments
  where created_at >= v_30d;

  select
    count(*)::int,
    coalesce(sum(total_amount), 0)
  into v_orders_count, v_orders_total
  from public.orders
  where created_at >= v_7d;

  select
    sum(case when status = 'new' then 1 else 0 end)::int,
    sum(case when status in ('new','triaged','in_progress') then 1 else 0 end)::int
  into v_feedback_new, v_feedback_open
  from public.app_feedback;

  select count(*)::int into v_active_devices
  from public.business_devices
  where active = true;

  select count(*)::int into v_seen_24h
  from public.business_devices
  where last_seen_at >= (v_now - interval '24 hours');

  return jsonb_build_object(
    'ok', true,
    'generated_at', v_now,
    'tenants', jsonb_build_object(
      'total', v_total_businesses,
      'active', v_active_businesses,
      'suspended', v_suspended_businesses,
      'locked', coalesce(v_locked, 0),
      'grace', coalesce(v_grace, 0)
    ),
    'payments_30d', jsonb_build_object(
      'total_amount', v_payments_total,
      'count', v_payments_count
    ),
    'orders_7d', jsonb_build_object(
      'count', v_orders_count,
      'total_amount', v_orders_total
    ),
    'feedback', jsonb_build_object(
      'new', coalesce(v_feedback_new, 0),
      'open', coalesce(v_feedback_open, 0)
    ),
    'devices', jsonb_build_object(
      'active', coalesce(v_active_devices, 0),
      'seen_24h', coalesce(v_seen_24h, 0)
    )
  );
end;
$$;

revoke all on function public.platform_kpis() from public;
grant execute on function public.platform_kpis() to authenticated;

create or replace function public.platform_tenant_health()
returns table (
  business_id uuid,
  name text,
  status text,
  plan_type text,
  paid_through timestamptz,
  grace_days integer,
  locked_override boolean,
  max_devices integer,
  active_devices integer,
  last_seen_at timestamptz,
  last_order_at timestamptz,
  access_state text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_platform_admin(v_uid) then
    raise exception 'Not authorized';
  end if;

  return query
    with dev as (
      select
        d.business_id,
        (count(*) filter (where d.active = true))::int as active_devices,
        max(d.last_seen_at) as last_seen_at
      from public.business_devices d
      group by d.business_id
    ),
    ord as (
      select
        o.business_id,
        max(o.created_at) as last_order_at
      from public.orders o
      group by o.business_id
    )
    select
      b.id as business_id,
      b.name,
      b.status,
      coalesce(nullif(trim(b.plan_type), ''), 'business_system') as plan_type,
      bb.paid_through,
      bb.grace_days,
      bb.locked_override,
      bb.max_devices,
      coalesce(dev.active_devices, 0) as active_devices,
      dev.last_seen_at,
      ord.last_order_at,
      case
        when b.status = 'suspended' or bb.locked_override = true then 'locked'
        when v_now <= bb.paid_through then 'active'
        when v_now <= (bb.paid_through + make_interval(days => bb.grace_days)) then 'grace'
        else 'locked'
      end as access_state
    from public.businesses b
    left join public.business_billing bb on bb.business_id = b.id
    left join dev on dev.business_id = b.id
    left join ord on ord.business_id = b.id
    order by b.created_at desc;
end;
$$;

revoke all on function public.platform_tenant_health() from public;
grant execute on function public.platform_tenant_health() to authenticated;

create or replace function public.soft_delete_business(p_business_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_platform_admin(v_uid) then
    raise exception 'Not authorized';
  end if;
  if p_business_id is null then
    raise exception 'Missing business_id';
  end if;

  update public.businesses
    set status = 'suspended',
        deleted_at = now(),
        deleted_reason = v_reason,
        deleted_by = v_uid,
        updated_at = now()
    where id = p_business_id;

  update public.business_billing
    set locked_override = true,
        updated_at = now()
    where business_id = p_business_id;

  update public.profiles
    set active = false,
        updated_at = now()
    where business_id = p_business_id
      and role <> 'platform_admin';

  update public.business_devices
    set active = false
    where business_id = p_business_id;
end;
$$;

revoke all on function public.soft_delete_business(uuid, text) from public;
grant execute on function public.soft_delete_business(uuid, text) to authenticated;

create or replace function public.restore_business(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_platform_admin(v_uid) then
    raise exception 'Not authorized';
  end if;
  if p_business_id is null then
    raise exception 'Missing business_id';
  end if;

  update public.businesses
    set status = 'active',
        deleted_at = null,
        deleted_reason = null,
        deleted_by = null,
        updated_at = now()
    where id = p_business_id;

  update public.business_billing
    set locked_override = false,
        updated_at = now()
    where business_id = p_business_id;
end;
$$;

revoke all on function public.restore_business(uuid) from public;
grant execute on function public.restore_business(uuid) to authenticated;

commit;
