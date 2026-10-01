-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 006 — Ensure Public User Function — FamilyHub
--
-- Problema: cuentas creadas en auth.users antes de que se aplicara el trigger
--           on_auth_user_created (migration_001) no tienen fila en public.users.
--           Los intentos de INSERT directo desde el cliente fallan con RLS 42501
--           porque PostgREST omite columnas con DEFAULT de servidor al calcular
--           el WITH CHECK de la política.
--
-- Solución: función SECURITY DEFINER que inserta el usuario actual en public.users
--           usando datos frescos de auth.users. Se llama vía supabase.rpc().
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.ensure_public_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email   text;
  v_nombre  text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return;  -- no autenticado, ignorar
  end if;

  select
    u.email,
    coalesce(u.raw_user_meta_data->>'nombre', split_part(u.email, '@', 1))
  into v_email, v_nombre
  from auth.users u
  where u.id = v_user_id;

  if v_email is null then
    return;  -- usuario no encontrado en auth.users
  end if;

  insert into public.users (id, email, nombre)
  values (v_user_id, v_email, v_nombre)
  on conflict (id) do nothing;
end;
$$;

-- Cualquier usuario autenticado puede llamar esta función
grant execute on function public.ensure_public_user() to authenticated;
