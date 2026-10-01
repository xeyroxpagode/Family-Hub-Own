-- Finance V1.1 Stage 6E.4 follow-up: nullable scope columns must be unique.

delete from public.finance_category_pool_defaults older
using public.finance_category_pool_defaults newer
where older.category_id = newer.category_id
  and older.financial_context_type = newer.financial_context_type
  and older.owner_person_id is not distinct from newer.owner_person_id
  and older.household_id is not distinct from newer.household_id
  and older.currency = newer.currency
  and (older.updated_at, older.created_at, older.id) < (newer.updated_at, newer.created_at, newer.id);

drop index if exists public.finance_category_pool_defaults_unique_idx;
create unique index finance_category_pool_defaults_unique_idx
  on public.finance_category_pool_defaults (
    category_id,
    financial_context_type,
    owner_person_id,
    household_id,
    currency
  ) nulls not distinct;
