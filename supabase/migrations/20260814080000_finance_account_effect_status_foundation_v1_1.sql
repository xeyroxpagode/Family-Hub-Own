-- Finance V1.1 Stage 4B - Account Effect Status Foundation.
--
-- Adds effect_status to finance_account_effects with ACTIVE/REVERSED values.
-- Updates current balance function to count only ACTIVE effects after Anchor boundary.
-- Historical rows remain preserved. No DELETE. No direct client mutation authority.

create extension if not exists "pgcrypto";

alter table public.finance_account_effects
  drop constraint if exists finance_account_effects_status_check;

alter table public.finance_account_effects
  add column if not exists effect_status text not null default 'ACTIVE';

alter table public.finance_account_effects
  add constraint finance_account_effects_status_check
  check (effect_status in ('ACTIVE', 'REVERSED'));

comment on column public.finance_account_effects.effect_status is
  'ACTIVE = participates in current balance after Anchor boundary. REVERSED = historical row preserved but excluded from current balance.';

create or replace function public.finance_account_current_balance_text(p_account_id uuid)
returns text
language sql
stable
as $$
  with latest_anchor as (
    select a.id, a.amount, a.effective_date, a.created_at
    from public.finance_account_balance_anchors a
    where a.account_id = p_account_id
    order by a.effective_date desc, a.created_at desc, a.id desc
    limit 1
  ),
  effect_sum as (
    select coalesce(sum(e.effect_amount), 0::numeric) as amount
    from public.finance_account_effects e
    cross join latest_anchor a
    where e.account_id = p_account_id
      and e.effect_status = 'ACTIVE'
      and (
        e.transaction_date > a.effective_date
        or (
          e.transaction_date = a.effective_date
          and e.transaction_created_at > a.created_at
        )
      )
  )
  select case
    when not public.finance_current_user_can_read_account(p_account_id) then null
    when not exists (select 1 from latest_anchor) then null
    else ((select amount from latest_anchor) + (select amount from effect_sum))::text
  end;
$$;

grant execute on function public.finance_account_current_balance_text(uuid) to authenticated;

create or replace function public.finance_account_effect_mutation(
  p_account_id uuid,
  p_transaction_id uuid,
  p_effect_status text
)
returns void
language plpgsql
security definer
as $$
begin
  if coalesce(current_setting('app.finance_account_effect_mutation', true), '') <> 'on' then
    raise exception 'finance_account_effect_mutation_forbidden' using errcode = '42501';
  end if;

  if p_effect_status not in ('ACTIVE', 'REVERSED') then
    raise exception 'invalid_effect_status' using errcode = '22023';
  end if;

  update public.finance_account_effects
  set effect_status = p_effect_status
  where account_id = p_account_id
    and transaction_id = p_transaction_id;

  if not found then
    raise exception 'finance_account_effect_not_found' using errcode = '42501';
  end if;
end;
$$;

grant execute on function public.finance_account_effect_mutation(uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';