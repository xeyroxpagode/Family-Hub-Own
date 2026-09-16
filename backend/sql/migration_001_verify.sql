-- =============================================================
-- migration_001_verify.sql
-- Verifica que migration_001_auth_base.sql fue aplicada correctamente.
-- Corre dentro de transacción y termina con ROLLBACK.
-- Ejecutar como postgres (superuser) en Supabase SQL Editor.
-- =============================================================

begin;

-- Insertar usuario de prueba directamente en auth.users (simula signup)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'authenticated',
  'authenticated',
  'verify@familyhub.test',
  'not_used',
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  jsonb_build_object('nombre', 'Usuario Verificacion'),
  now(),
  now()
) on conflict (id) do nothing;

-- 1. Trigger: public.users fue creado automáticamente
do $$
declare
  v_nombre text;
begin
  select nombre into v_nombre
  from public.users
  where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

  if v_nombre is null then
    raise exception 'FALLO: trigger no creó la fila en public.users';
  end if;

  if v_nombre != 'Usuario Verificacion' then
    raise exception 'FALLO: nombre incorrecto — esperado "Usuario Verificacion", obtenido "%"', v_nombre;
  end if;

  raise notice 'OK [1/4] trigger on_auth_user_created funcionó correctamente';
end;
$$;

-- 2. updated_at trigger funciona
update public.users
set nombre = 'Usuario Verificacion Actualizado'
where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

do $$
declare
  v_created timestamptz;
  v_updated timestamptz;
begin
  select created_at, updated_at into v_created, v_updated
  from public.users
  where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

  raise notice 'OK [2/4] updated_at trigger — created_at: %, updated_at: %', v_created, v_updated;
end;
$$;

-- 3. Tablas existen con columnas clave
do $$
begin
  if to_regclass('public.users') is null then
    raise exception 'FALLO: public.users no existe';
  end if;
  if to_regclass('public.households') is null then
    raise exception 'FALLO: public.households no existe';
  end if;
  if to_regclass('public.household_members') is null then
    raise exception 'FALLO: public.household_members no existe';
  end if;
  if to_regclass('public.invitations') is null then
    raise exception 'FALLO: public.invitations no existe';
  end if;
  raise notice 'OK [3/4] las 4 tablas existen';
end;
$$;

-- 4. Índices existen
do $$
declare
  idx_count int;
begin
  select count(*) into idx_count
  from pg_indexes
  where schemaname = 'public'
    and indexname in (
      'idx_household_members_household_id',
      'idx_household_members_user_id',
      'idx_invitations_token',
      'idx_invitations_household_id'
    );

  if idx_count < 4 then
    raise exception 'FALLO: faltan índices — encontrados % de 4', idx_count;
  end if;

  raise notice 'OK [4/4] los 4 índices existen';
end;
$$;

-- Ver el usuario creado
select id, email, nombre, created_at, updated_at
from public.users
where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

rollback;
