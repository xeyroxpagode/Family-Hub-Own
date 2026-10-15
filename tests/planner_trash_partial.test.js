'use strict';

// Front A · Gate 1 (P0-A): la Papelera degrada por rama en vez de devolver
// "Error interno" cuando una sola rama (planes/hitos/horarios) falla.
// Comportamiento real del servicio con clientes Supabase simulados;
// sin red ni base de datos.

const path = require('node:path');

const servicePath = path.join(__dirname, '..', 'backend', 'src', 'services', 'planner.trash.service.js');
const configPath = path.join(__dirname, '..', 'backend', 'src', 'config', 'supabase.js');

let failures = 0;
const assert = (condition, message) => {
  if (!condition) {
    failures += 1;
    console.error(`  FAIL: ${message}`);
  }
};

// Constructor de queries encadenable y esperable (thenable), como PostgREST.
const CHAIN_METHODS = ['select', 'eq', 'not', 'or', 'order', 'limit', 'in', 'is'];
const makeBuilder = (table, onExecute) => {
  const ops = [];
  const builder = {};
  for (const method of CHAIN_METHODS) {
    builder[method] = (...args) => {
      ops.push({ method, args });
      return builder;
    };
  }
  builder.maybeSingle = () => onExecute(table, ops, 'maybeSingle');
  builder.then = (resolve, reject) => {
    Promise.resolve()
      .then(() => onExecute(table, ops, 'list'))
      .then(resolve, reject);
  };
  return builder;
};
const makeClient = (onExecute) => ({ from: (table) => makeBuilder(table, onExecute) });

const TASK_ROW = {
  id: 'task-1',
  household_id: 'h-1',
  title: 'Sacar la basura',
  status: 'pending',
  trashed_at: '2026-10-10T10:00:00.000Z',
  trashed_by_member_id: null,
  version: 3,
  household_members: null,
};
const EVENT_ROW = {
  id: 'event-1',
  household_id: 'h-1',
  title: 'Reunión',
  status: 'scheduled',
  trashed_at: '2026-10-09T10:00:00.000Z',
  trashed_by_member_id: null,
  version: 1,
  household_members: null,
};

const ok = (data) => ({ data, error: null });

// Carga el servicio con un admin simulado, sin ejecutar config/supabase.
const loadServiceWithAdmin = (adminHandler) => {
  delete require.cache[servicePath];
  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: { supabaseAdmin: makeClient(adminHandler) },
  };
  return require(servicePath);
};

const rlsHandler = (table) => {
  if (table === 'planner_tasks') return ok([TASK_ROW]);
  if (table === 'planner_events') return ok([EVENT_ROW]);
  return ok([]);
};

const contextWith = () => ({ householdId: 'h-1', personId: 'p-1', client: makeClient(rlsHandler) });

async function main() {
  // Test 1: una rama rota (planes) no tumba la papelera completa.
  console.log('Test 1: fallo en planes degrada sin arrojar y conserva tareas/eventos');
  {
    const recorded = [];
    const adminHandler = (table, ops) => {
      recorded.push({ table, ops });
      const select = ops.find((op) => op.method === 'select')?.args[0] ?? '';
      if (table === 'planner_goals' && select.includes('household_members')) {
        return { data: null, error: { message: 'boom' } };
      }
      return ok([]);
    };
    const { listTrash } = loadServiceWithAdmin(adminHandler);
    let result = null;
    let threw = null;
    try {
      result = await listTrash(contextWith(), { type: 'all', limit: 100 });
    } catch (err) {
      threw = err;
    }
    assert(threw === null, 'listTrash no debe arrojar cuando falla solo planes');
    assert(result && result.items.length === 2, `debe devolver tareas+eventos (2), devolvió ${result?.items.length}`);
    assert(result && result.items[0].id === 'task-1', 'ordena por trashed_at descendente');
    console.log('  PASS: degradación parcial');
  }

  // Test 2: hitos filtran por hogar con join interno (!inner).
  console.log('Test 2: hitos usan !inner para filtrar por household_id embebido');
  {
    const recorded = [];
    const adminHandler = (table, ops) => {
      recorded.push({ table, ops });
      return ok([]);
    };
    const { listTrash } = loadServiceWithAdmin(adminHandler);
    await listTrash(contextWith(), { type: 'all', limit: 100 });
    const milestones = recorded.find(
      (entry) => entry.table === 'planner_goal_milestones'
        && (entry.ops.find((op) => op.method === 'select')?.args[0] ?? '').includes('planner_goals'),
    );
    const select = milestones?.ops.find((op) => op.method === 'select')?.args[0] ?? '';
    assert(select.includes('!inner'), 'el select de hitos debe incluir !inner');
    console.log('  PASS: join interno en hitos');
  }

  // Test 3: sin personId no se construye un `or` inválido con "undefined".
  console.log('Test 3: contexto sin personId no genera filtro or con undefined');
  {
    const recorded = [];
    const adminHandler = (table, ops) => {
      recorded.push({ table, ops });
      return ok([]);
    };
    const { listTrash } = loadServiceWithAdmin(adminHandler);
    const context = { householdId: 'h-1', client: makeClient(rlsHandler) };
    let threw = null;
    try {
      await listTrash(context, { type: 'goals', limit: 100 });
    } catch (err) {
      threw = err;
    }
    assert(threw === null, 'listTrash(goals) sin personId no debe arrojar');
    const orArg = recorded
      .flatMap((entry) => entry.ops)
      .find((op) => op.method === 'or')?.args[0] ?? '';
    assert(!orArg.includes('undefined'), `el or no debe contener "undefined": ${orArg}`);
    assert(orArg.includes('household_id.eq.h-1'), 'el or conserva el filtro por hogar');
    console.log('  PASS: guarda de personId');
  }

  // Test 4: type=tasks solo consulta tareas.
  console.log('Test 4: filtro por tipo no toca ramas de planes');
  {
    const tables = [];
    const adminHandler = (table) => {
      tables.push(table);
      return ok([]);
    };
    const rlsTables = [];
    const context = {
      householdId: 'h-1',
      personId: 'p-1',
      client: { from: (table) => { rlsTables.push(table); return makeBuilder(table, rlsHandler); } },
    };
    const { listTrash } = loadServiceWithAdmin(adminHandler);
    const result = await listTrash(context, { type: 'tasks', limit: 100 });
    assert(result.items.length === 1 && result.items[0].type === 'task', 'solo devuelve tareas');
    assert(tables.length === 0, 'no consulta el admin cuando type=tasks');
    assert(rlsTables.length === 1 && rlsTables[0] === 'planner_tasks', 'solo lee planner_tasks');
    console.log('  PASS: alcance por tipo');
  }

  if (failures > 0) {
    console.error(`\n=== PLANNER TRASH PARTIAL: ${failures} FALLAS ===`);
    process.exit(1);
  }
  console.log('\n=== PLANNER TRASH PARTIAL: ALL TESTS PASSED ===');
}

main().catch((err) => {
  console.error('FAIL inesperado:', err);
  process.exit(1);
});
