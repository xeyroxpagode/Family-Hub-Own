begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not condition then
    raise exception '%', message;
  end if;
end;
$$;

create or replace function pg_temp.set_authenticated_context(user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id::text, 'role', 'authenticated')::text,
    true
  );
end;
$$;

create or replace function pg_temp.ensure_public_profile(
  profile_id uuid,
  profile_email text,
  profile_name text
)
returns void
language plpgsql
as $$
begin
  insert into public.perfiles (id, nombre, email, avatar_url, creado_el)
  values (profile_id, profile_name, profile_email, '', now())
  on conflict (id) do nothing;
end;
$$;

do $$
begin
  if to_regclass('public.grupos_familiares') is null then
    raise exception 'Missing table public.grupos_familiares';
  end if;

  if to_regclass('public.miembros_grupo') is null then
    raise exception 'Missing table public.miembros_grupo';
  end if;

  if to_regclass('public.perfiles') is null then
    raise exception 'Missing table public.perfiles';
  end if;

  if to_regclass('auth.users') is null then
    raise exception 'Missing table auth.users';
  end if;
end;
$$;

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
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'user_a@familyhub.test',
    'not_used',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nombre":"User A"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'user_b@familyhub.test',
    'not_used',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nombre":"User B"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

select pg_temp.ensure_public_profile(
  '11111111-1111-1111-1111-111111111111',
  'user_a@familyhub.test',
  'User A'
);

select pg_temp.ensure_public_profile(
  '22222222-2222-2222-2222-222222222222',
  'user_b@familyhub.test',
  'User B'
);

set local role authenticated;
select pg_temp.set_authenticated_context('11111111-1111-1111-1111-111111111111');

insert into public.grupos_familiares (id, nombre, tipo_familia, creador_id, creado_el)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Grupo A',
  'nucleo',
  '11111111-1111-1111-1111-111111111111',
  now()
);

insert into public.miembros_grupo (id, usuario_id, grupo_id, rol, unido_el)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'ADMINISTRADOR'::public.rol_familiar,
  now()
);

reset role;

set local role authenticated;
select pg_temp.set_authenticated_context('22222222-2222-2222-2222-222222222222');

insert into public.grupos_familiares (id, nombre, tipo_familia, creador_id, creado_el)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Grupo B',
  'abuelos',
  '22222222-2222-2222-2222-222222222222',
  now()
);

insert into public.miembros_grupo (id, usuario_id, grupo_id, rol, unido_el)
values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'ADMINISTRADOR'::public.rol_familiar,
  now()
);

reset role;

set local role authenticated;
select pg_temp.set_authenticated_context('11111111-1111-1111-1111-111111111111');

select pg_temp.assert_true(
  (select count(*) from public.grupos_familiares where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 1,
  'user_a deberia poder ver su propio grupo'
);

select pg_temp.assert_true(
  (select count(*) from public.grupos_familiares where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 0,
  'user_a no deberia poder ver el grupo de user_b'
);

select pg_temp.assert_true(
  (select count(*) from public.perfiles where id = '11111111-1111-1111-1111-111111111111') = 1,
  'user_a deberia poder ver su propio perfil'
);

-- user_a intenta modificar el perfil de user_b (RLS bloquea silenciosamente)
update public.perfiles
set nombre = 'MODIFICADO_POR_A'
where id = '22222222-2222-2222-2222-222222222222';

reset role;

-- verificacion como superuser: el dato no cambio
select pg_temp.assert_true(
  (select count(*) from public.perfiles where id = '22222222-2222-2222-2222-222222222222' and nombre = 'User B') = 1,
  'user_a no deberia poder actualizar el perfil de user_b'
);

rollback;
