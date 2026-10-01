-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 007 — join_household_by_token() RPC — FamilyHub
--
-- Problema: la política RLS de invitations_select solo permite al coordinador
--           leer invitaciones. Cuando un usuario invitado (que todavía no
--           pertenece a ningún hogar) intenta unirse con un token, la SELECT
--           retorna 0 filas → la app reporta "invitación no encontrada".
--
-- Solución: función SECURITY DEFINER que lee, valida, inserta el miembro y
--           marca la invitación como usada en una única transacción, sin que
--           el cliente necesite acceso directo a la tabla invitations.
--
-- Reemplaza la lógica client-side de services/invitations.ts joinHouseholdByToken.
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.join_household_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_inv     public.invitations%rowtype;
  v_user_id uuid := auth.uid();
begin
  -- Require authentication
  if v_user_id is null then
    return jsonb_build_object('error', 'No estás autenticado.');
  end if;

  -- Find a valid, unused, non-expired invitation by token
  select *
  into   v_inv
  from   public.invitations
  where  token    = p_token
    and  used_at  is null
    and  expires_at > now();

  if not found then
    return jsonb_build_object('error', 'La invitación no existe, ya fue usada o expiró. Pedile al coordinador una nueva.');
  end if;

  -- Ensure the invitee has a row in public.users (needed for FK).
  -- This covers accounts created before the on_auth_user_created trigger.
  insert into public.users (id, email, nombre)
  select
    u.id,
    u.email,
    coalesce(u.raw_user_meta_data->>'nombre', split_part(u.email, '@', 1))
  from auth.users u
  where u.id = v_user_id
  on conflict (id) do nothing;

  -- Insert the member (unique constraint prevents duplicate membership)
  begin
    insert into public.household_members (user_id, household_id, rol, invited_by)
    values (v_user_id, v_inv.household_id, v_inv.rol_asignado, v_inv.created_by);
  exception when unique_violation then
    return jsonb_build_object('error', 'Ya eres miembro de este hogar.');
  end;

  -- Mark invitation as used (atomic with the insert above)
  update public.invitations
  set    used_at  = now(),
         used_by  = v_user_id
  where  id = v_inv.id;

  return jsonb_build_object(
    'household_id', v_inv.household_id,
    'rol',          v_inv.rol_asignado,
    'error',        null
  );
end;
$$;

-- Grant execution to any authenticated user
grant execute on function public.join_household_by_token(text) to authenticated;
