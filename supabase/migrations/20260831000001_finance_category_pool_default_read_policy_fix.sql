-- Finance V1.1 Stage 6E.4 follow-up: avoid RLS recursion when reading a default.

create or replace function public.finance_current_user_can_read_category_pool_default(p_default_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.finance_category_pool_defaults fcpd
    join public.finance_categories fc on fc.id = fcpd.category_id
    where fcpd.id = p_default_id
      and (
        (
          fcpd.financial_context_type = 'personal'
          and fcpd.owner_person_id = public.current_person_id()
        )
        or (
          fcpd.financial_context_type = 'household'
          and exists (
            select 1
            from public.people p
            where p.id = public.current_person_id()
              and p.active_household_id = fcpd.household_id
          )
          and public.is_active_household_member(fcpd.household_id)
        )
      )
      and (
        fc.category_kind = 'native'
        or (
          fc.category_kind = 'custom'
          and fc.deleted_at is null
          and (
            (fc.context_type = 'personal' and fc.owner_person_id = public.current_person_id())
            or (fc.context_type = 'household' and fc.household_id = fcpd.household_id
                and exists (
                  select 1 from public.people p
                  where p.id = public.current_person_id()
                    and p.active_household_id = fc.household_id
                )
                and public.is_active_household_member(fc.household_id))
          )
        )
      )
  );
$$;

grant execute on function public.finance_current_user_can_read_category_pool_default(uuid) to authenticated;

notify pgrst, 'reload schema';
