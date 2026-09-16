-- ═══════════════════════════════════════════════════════════════════════════════
-- TEST RLS — FamilyHub
--
-- Requisitos:
--   · Conexión directa a Postgres con rol superuser (no PostgREST)
--   · migration_001_auth_base.sql y migration_002_rls_auth.sql ya aplicadas
--   · Roles 'authenticated' y 'anon' presentes (toda instancia Supabase los tiene)
--
-- Todo corre dentro de una transacción que termina con ROLLBACK.
-- No quedan datos en la base al finalizar.
--
-- UUIDs fijos (reproducibilidad):
--   USER_A  → aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
--   USER_B  → bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
--   HOGAR_A → cccccccc-cccc-cccc-cccc-cccccccccccc
--   HOGAR_B → dddddddd-dddd-dddd-dddd-dddddddddddd
-- ═══════════════════════════════════════════════════════════════════════════════

begin;


-- ── 0. SETUP: datos como superuser (bypasa RLS) ───────────────────────────────

do $setup$
begin

  -- Insertar en auth.users; el trigger on_auth_user_created puebla public.users
  insert into auth.users (
    id, instance_id,
    email, aud, role,
    encrypted_password, email_confirmed_at,
    raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at
  ) values
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '00000000-0000-0000-0000-000000000000',
      'user_a@test.familyhub', 'authenticated', 'authenticated',
      crypt('pass-a', gen_salt('bf')), now(),
      '{"nombre":"User A"}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      now(), now()
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      '00000000-0000-0000-0000-000000000000',
      'user_b@test.familyhub', 'authenticated', 'authenticated',
      crypt('pass-b', gen_salt('bf')), now(),
      '{"nombre":"User B"}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      now(), now()
    )
  on conflict (id) do nothing;

  -- El trigger debería haber creado public.users; upsert por si el trigger falló
  insert into public.users (id, email, nombre) values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_a@test.familyhub', 'User A'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_b@test.familyhub', 'User B')
  on conflict (id) do update set nombre = excluded.nombre;

  -- Hogares separados: User A y User B no comparten ninguno
  insert into public.households (id, nombre, tipo, created_by) values
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Hogar A', 'nucleo',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Hogar B', 'nucleo',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  on conflict (id) do nothing;

  -- Cada usuario es coordinador únicamente de su propio hogar
  insert into public.household_members (household_id, user_id, rol) values
    ('cccccccc-cccc-cccc-cccc-cccccccccccc',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'coordinador'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'coordinador')
  on conflict (household_id, user_id) do nothing;

end;
$setup$;


-- ── Activar sesión de user_a ───────────────────────────────────────────────────
-- SET LOCAL ROLE + set_config inyecta el JWT que auth.uid() lee (campo 'sub').
-- Afecta solo esta transacción.

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);


-- ── TEST 1: user_a NO puede SELECT el hogar de user_b ─────────────────────────

do $test1$
declare
  resultado integer;
begin
  select count(*)::int into resultado
  from public.households
  where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';  -- hogar de user_b

  assert resultado = 0,
    format('[TEST 1 FAIL] user_a ve el hogar de user_b (%s filas)', resultado);

  raise notice '[TEST 1 PASS] user_a NO puede SELECT el hogar de user_b';
end;
$test1$;


-- ── TEST 2: user_a SÍ puede SELECT su propio hogar ────────────────────────────

do $test2$
declare
  resultado integer;
begin
  select count(*)::int into resultado
  from public.households
  where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';  -- hogar de user_a

  assert resultado = 1,
    format('[TEST 2 FAIL] user_a no puede ver su propio hogar (%s filas)', resultado);

  raise notice '[TEST 2 PASS] user_a SÍ puede SELECT su propio hogar';
end;
$test2$;


-- ── TEST 3: user_a NO puede UPDATE el perfil de user_b ────────────────────────
-- RLS filtra la fila ajena silenciosamente → UPDATE afecta 0 filas, sin error.

do $test3$
declare
  filas_afectadas integer;
begin
  update public.users
  set    nombre = 'HACKEADO'
  where  id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';  -- perfil de user_b

  get diagnostics filas_afectadas = row_count;

  assert filas_afectadas = 0,
    format('[TEST 3 FAIL] user_a pudo UPDATE el perfil de user_b (%s filas)', filas_afectadas);

  raise notice '[TEST 3 PASS] user_a NO puede UPDATE el perfil de user_b (0 filas afectadas)';
end;
$test3$;


-- ── TEST 4 (bonus): user_a NO puede ver el perfil de user_b (sin hogar en común)

do $test4$
declare
  resultado integer;
begin
  select count(*)::int into resultado
  from public.users
  where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  assert resultado = 0,
    format('[TEST 4 FAIL] user_a ve el perfil de user_b sin hogar en común (%s filas)', resultado);

  raise notice '[TEST 4 PASS] user_a NO puede SELECT el perfil de user_b (sin hogar compartido)';
end;
$test4$;


-- ── Fin ───────────────────────────────────────────────────────────────────────

reset role;

raise notice '════════════════════════════════════════════════════';
raise notice 'Todos los tests RLS pasaron correctamente.          ';
raise notice '════════════════════════════════════════════════════';

rollback;  -- ningún dato queda en la base
