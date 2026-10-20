-- Inventory V2 Block 3: tracked Finance source. The canonical Finance transaction RPC is reused.
create table if not exists public.finance_transaction_sources(
 id uuid primary key default gen_random_uuid(),
 transaction_id uuid not null references public.finance_transactions(id),
 source_module text not null,
 source_entity_type text not null,
 source_entity_id uuid not null,
 created_at timestamptz not null default now(),
 constraint finance_transaction_sources_identity_unique unique(source_module,source_entity_type,source_entity_id)
);
alter table public.finance_transaction_sources enable row level security;
revoke all on public.finance_transaction_sources from anon,authenticated;

create or replace function public.finance_create_inventory_purchase_expense_v1(p_purchase_session_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid;v_household uuid;v_purchase public.inventory_purchase_sessions%rowtype;v_source public.finance_transaction_sources%rowtype;v_transaction public.finance_transactions%rowtype;
begin
 select id,active_household_id into v_actor,v_household from public.people where auth_user_id=auth.uid();if v_actor is null then raise exception 'finance_actor_required';end if;
 select * into v_purchase from public.inventory_purchase_sessions where id=p_purchase_session_id and household_id=v_household and status='completed' for update;if not found then raise exception 'inventory_purchase_not_found';end if;if coalesce(v_purchase.total_amount_minor,0)<=0 then raise exception 'inventory_purchase_total_required';end if;
 select * into v_source from public.finance_transaction_sources where source_module='inventory' and source_entity_type='inventory_purchase' and source_entity_id=v_purchase.id for update;
 if found then return jsonb_build_object('outcome','replay','transaction_id',v_source.transaction_id);end if;
 select * into v_transaction from public.finance_create_transaction_with_optional_account_effect_v1('expense',v_purchase.total_amount_minor::numeric/100,'ARS','household',null,v_household,v_purchase.completed_local_date,'Compra del hogar',null,null,null,v_actor,null,null);
 insert into public.finance_transaction_sources(transaction_id,source_module,source_entity_type,source_entity_id) values(v_transaction.id,'inventory','inventory_purchase',v_purchase.id) returning * into v_source;
 return jsonb_build_object('outcome','created','transaction_id',v_transaction.id);
exception when unique_violation then select * into v_source from public.finance_transaction_sources where source_module='inventory' and source_entity_type='inventory_purchase' and source_entity_id=p_purchase_session_id;return jsonb_build_object('outcome','replay','transaction_id',v_source.transaction_id);
end $$;
grant execute on function public.finance_create_inventory_purchase_expense_v1(uuid) to authenticated;

create or replace function public.inventory_purchase_finance_link(p_purchase_session_id uuid,p_transaction_id uuid,p_error_code text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid;v_household uuid;v_purchase public.inventory_purchase_sessions%rowtype;
begin select id,active_household_id into v_actor,v_household from public.people where auth_user_id=auth.uid();select * into v_purchase from public.inventory_purchase_sessions where id=p_purchase_session_id and household_id=v_household and status='completed' for update;if not found then raise exception 'inventory_purchase_not_found';end if;
 update public.inventory_purchase_sessions set finance_sync_status=case when p_transaction_id is null then 'failed' else 'linked' end,finance_transaction_id=coalesce(p_transaction_id,finance_transaction_id),finance_sync_error_code=case when p_transaction_id is null then coalesce(p_error_code,'finance_sync_failed') else null end,updated_at=now() where id=v_purchase.id returning * into v_purchase;return jsonb_build_object('session',to_jsonb(v_purchase));end $$;
grant execute on function public.inventory_purchase_finance_link(uuid,uuid,text) to authenticated;
