'use strict';

/**
 * HOMePLUS Assets — S7 runtime harness (LOCAL_RUNTIME_REQUIRED).
 *
 * Pluma compartida para los scripts de certificacion S7
 * (ASSETS <-> PLANNER):
 *   - resuelve la stack AISLADA de S7 (project_id HpAssetsS7, puertos
 *     propios). NUNCA usa la stack compartida global (56221/56222) ni
 *     presupone que la stack aislada anterior (S5C) este libre.
 *   - reutiliza el harness de S5-C (arranque del backend real, cliente HTTP,
 *     fixtures descartables, recorder) sin duplicarlo.
 *
 * No resetea ninguna base: cada fixture es un Household descartable que se
 * elimina al final del script.
 */

const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('../backend/node_modules/dotenv');
const {
  loadTestEnvironment,
  requireLocalUrl,
} = require('../tests/helpers/environment');

const s5c = require('./assets_s5c_runtime_helpers');

const REPO_ROOT = path.resolve(__dirname, '..');
const S7_ENV_FILE = path.join(REPO_ROOT, '.env.s7.local');

/**
 * Prioridad: `.env.s7.local` (stack aislada de S7) > `.env.test.local` >
 * `supabase status`. El archivo de S7 manda porque la certificacion S7
 * necesita SU propia pila, no la de otra sesion.
 */
function loadS7RuntimeEnv() {
  const introduced = new Set();

  if (fs.existsSync(S7_ENV_FILE)) {
    const parsed = dotenv.parse(fs.readFileSync(S7_ENV_FILE));
    for (const [name, value] of Object.entries(parsed)) {
      if (process.env[name] === undefined) {
        process.env[name] = value;
        introduced.add(name);
      }
    }
  }

  loadTestEnvironment({
    required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'LOCAL_DATABASE_URL'],
  });

  requireLocalUrl('SUPABASE_URL');
  requireLocalUrl('LOCAL_DATABASE_URL');

  return {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    LOCAL_DATABASE_URL: process.env.LOCAL_DATABASE_URL,
  };
}

/** Reporta el destino sin imprimir secretos. */
function describeStack(env) {
  const url = new URL(env.SUPABASE_URL);
  const db = new URL(env.LOCAL_DATABASE_URL);
  return {
    api: `${url.protocol}//${url.host}`,
    db: `${db.protocol}//${db.host}${db.pathname}`,
  };
}

/**
 * Fixture world de S7: reusa el de S5-C y agrega lo minimo que necesita la
 * integracion (crear un activo y limpiar filas de Planner si el cascade no
 * alcanzara).
 */
function createS7FixtureWorld(env, marker) {
  const world = s5c.createFixtureWorld(env, marker);

  /**
   * Tablas que el harness de S5-C borra en un ORDEN especifico (Assets:
   * care -> records -> assets -> categories). No se tocan aqui.
   */
  const ASSETS_MANAGED_TABLES = new Set([
    'assets',
    'assets_care',
    'assets_records',
    'assets_record_links',
    'assets_record_periods',
    'assets_idempotency_keys',
    'asset_categories',
    'asset_archive_episodes',
    'asset_trash_episodes',
    'household_members',
  ]);

  /**
   * `audit_events` es append-only: el trigger `audit_events_prevent_update_delete`

   * bloquea el DELETE y tambien el UPDATE que dispara el ON DELETE SET NULL de
   * household_members. Para limpiar un Household DESCARTABLE hay que desactivar
   * SOLO ese trigger (no el de la FK) mientras se borran las filas del fixture.
   */
  const deleteHouseholdScopedRows = async (households) => {
    const { Client } = require('../backend/node_modules/pg');
    const client = new Client({ connectionString: env.LOCAL_DATABASE_URL });
    await client.connect();
    try {
      await client.query('alter table public.audit_events disable trigger audit_events_prevent_update_delete');
      try {
        // Los ids se interpolan como literales: un DO block no puede llevar
        // placeholders ($1) porque el cuerpo es una cadena.
        const idsLiteral = households.map((id) => `'${id}'::uuid`).join(', ');
        await client.query(`
          do $$
          declare
            h record;
            tbl text;
          begin
            for h in select id from public.households where id = any(array[${idsLiteral}]::uuid[]) loop
              for tbl in select table_name from information_schema.columns
                         where table_schema = 'public' and column_name = 'household_id'
                         group by table_name loop
                begin
                  execute format('delete from public.%I where household_id = %L', tbl, h.id);
                exception when others then null;
                end;
              end loop;
              begin
                delete from public.assets where household_id = h.id;
              exception when others then null;
              end;
              begin
                delete from public.household_members where household_id = h.id;
              exception when others then null;
              end;
              begin
                update public.people set active_household_id = null where active_household_id = h.id;
              exception when others then null;
              end;
              begin
                delete from public.households where id = h.id;
              exception when others then null;
              end;
            end loop;
          end $$;
        `);
      } finally {

        await client.query('alter table public.audit_events enable trigger audit_events_prevent_update_delete');
      }
    } catch (error) {
      console.error(`  CLEANUP FAIL: household-scoped rows: ${error?.message ?? error}`);
    } finally {
      await client.end();
    }
  };

  /**
   * S7 deja filas de Planner (tasks/events/series/idempotencia/audit) que
   * bloquean el borrado del Household (FK RESTRICT + trigger de "task
   * creator is immutable"). Se limpian ANTES del destroy de S5-C y siempre
   * acotadas al Household descartable del fixture: nunca un reset global.
   */
  const destroyPlannerRows = async () => {
    const households = world.cleanup.householdIds;
    if (!households.length) return;
    await deleteHouseholdScopedRows(households);
  };

  const baseDestroy = world.destroy.bind(world);
  world.destroy = async () => {
    await destroyPlannerRows();
    await baseDestroy();
  };

  world.createAsset = async (householdId, name, profile = 'STANDARD') => {
    const { data, error } = await world.serviceClient
      .from('assets')
      .insert({ household_id: householdId, name, profile, lifecycle_status: 'ACTIVE' })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  };

  /**
   * Marca una Task como archivada. La capability `task.archive` esta apagada
   * para TODOS los roles del producto, asi que no hay via HTTP para producir
   * este estado: se usa la MISMA bandera de proyeccion interna que usa el
   * propio Planner (`homeplus.planner_internal_projection`), que es lo que
   * salta el guard de actor del trigger de planner_tasks.
   */
  world.markTaskArchived = async (taskId) => {
    const { Client } = require('../backend/node_modules/pg');
    const client = new Client({ connectionString: env.LOCAL_DATABASE_URL });
    await client.connect();
    try {
      await client.query("select set_config('homeplus.planner_internal_projection', 'on', false)");
      const result = await client.query(
        'update public.planner_tasks set archived_at = now() where id = $1',
        [taskId],
      );
      return result.rowCount;
    } finally {
      await client.end();
    }
  };

  world.countPlannerItems = async (householdId, assetId) => {
    const tasks = await world.serviceClient
      .from('planner_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .eq('origin_module', 'assets')
      .eq('origin_entity_type', 'asset')
      .eq('origin_entity_id', assetId);
    const events = await world.serviceClient
      .from('planner_events')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .eq('origin_module', 'assets')
      .eq('origin_entity_type', 'asset')
      .eq('origin_entity_id', assetId);
    return {
      tasks: tasks.count ?? 0,
      events: events.count ?? 0,
      total: (tasks.count ?? 0) + (events.count ?? 0),
    };
  };

  return world;
}

module.exports = {
  REPO_ROOT,
  loadS7RuntimeEnv,
  describeStack,
  createS7FixtureWorld,
  findFreePort: s5c.findFreePort,
  startBackend: s5c.startBackend,
  waitForHealth: s5c.waitForHealth,
  /**
   * Igual que el cliente de S5-C, pero además devuelve las cabeceras de
   * respuesta: S7 debe verificar el contrato de caché (no-store, private,
   * no-cache, must-revalidate) del read model.
   */
  makeApi: (port) => {
    const base = s5c.makeApi(port);
    return async function api(method, apiPath, options = {}) {
      const response = await fetch(`http://127.0.0.1:${port}/api${apiPath}`, {
        method,
        headers: {
          ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
          ...(options.headers ?? {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
      let json = null;
      try { json = await response.json(); } catch { /* no body */ }
      return {
        status: response.status,
        body: json,
        headers: response.headers,
      };
    };
  },
  createRecorder: s5c.createRecorder,
};
