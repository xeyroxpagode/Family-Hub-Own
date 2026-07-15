-- G0.5 removes three non-functional legacy overloads that reference columns
-- removed by the final people/household model. Active replacements are kept:
--   create_household(text, text, text, text, jsonb)
--   join_household_by_invite_token(text)
-- The valid two-argument Finance balance overload, where present remotely, is
-- intentionally not changed.

begin;

drop function if exists public.get_expense_balance(uuid);
drop function if exists public.join_household_by_token(text);
drop function if exists public.create_household_rpc(text, text);

commit;
