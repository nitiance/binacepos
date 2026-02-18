-- BinanceXI POS: cross-tenant hardening for SECURITY DEFINER stock RPCs
-- Ensure product UUIDs from other tenants cannot be updated.

begin;

create or replace function public.decrement_stock(p_product_id uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

  update public.products
    set stock_quantity = greatest(0, stock_quantity - p_qty),
        updated_at = now()
    where id = p_product_id
      and business_id = public.current_business_id();
end;
$$;

create or replace function public.increment_stock(p_product_id uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

  update public.products
    set stock_quantity = stock_quantity + p_qty,
        updated_at = now()
    where id = p_product_id
      and business_id = public.current_business_id();
end;
$$;

commit;
