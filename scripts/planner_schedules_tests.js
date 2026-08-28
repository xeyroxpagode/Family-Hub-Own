'use strict';

const schedules = require('../backend/src/services/planner.schedules.service');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${message}`);
  }
}

function createContext(options = {}) {
  const calls = { rpc: [], scheduleReads: 0 };
  const member = options.member ?? { person_id: 'person-other' };
  const blocks = options.blocks ?? [];

  const client = {
    from(table) {
      if (table === 'household_people_public') {
        const query = {
          select() { return query; },
          eq() { return query; },
          async maybeSingle() { return { data: member, error: null }; },
        };
        return query;
      }
      if (table === 'household_schedule_blocks') {
        const query = {
          select() { return query; },
          eq() { return query; },
          async order() {
            calls.scheduleReads += 1;
            return { data: blocks, error: options.blocksError ?? null };
          },
        };
        return query;
      }
      throw new Error(`Tabla inesperada: ${table}`);
    },
    async rpc(name, payload) {
      calls.rpc.push({ name, payload });
      return options.rpcError
        ? { data: null, error: options.rpcError }
        : { data: options.canView ?? true, error: null };
    },
  };

  return {
    context: { client, householdId: 'household-1', personId: 'person-self' },
    calls,
  };
}

async function run() {
  {
    const { context, calls } = createContext({ blocks: [{ id: 'own-block' }] });
    const result = await schedules.listSchedules(context, 'person-self');
    assert(calls.rpc.length === 0, 'el horario propio no consulta privacidad ajena');
    assert(result.schedules[0]?.id === 'own-block', 'el horario propio se carga desde la fuente real');
  }

  {
    const { context, calls } = createContext({ canView: false });
    const result = await schedules.listSchedules(context, 'person-other');
    assert(calls.rpc[0]?.name === 'can_view_household_schedule', 'la visibilidad ajena usa la autoridad SQL canónica');
    assert(result.can_view === false && result.schedules.length === 0, 'un horario privado devuelve estado privado sin leer bloques');
    assert(calls.scheduleReads === 0, 'no se consultan bloques cuando la autoridad niega visibilidad');
  }

  {
    const { context, calls } = createContext({ canView: true, blocks: [{ id: 'shared-block' }] });
    const result = await schedules.listSchedules(context, 'person-other');
    assert(result.can_view === true && result.schedules[0]?.id === 'shared-block', 'un horario compartido llega a Home');
    assert(calls.rpc[0]?.payload?.p_household_id === 'household-1', 'la autoridad recibe el Household activo');
    assert(calls.rpc[0]?.payload?.p_person_id === 'person-other', 'la autoridad recibe el person_id solicitado');
  }

  {
    const rpcError = { message: 'visibility lookup failed', details: 'db detail', hint: 'db hint' };
    const { context } = createContext({ rpcError });
    try {
      await schedules.listSchedules(context, 'person-other');
      assert(false, 'un error real de visibilidad no se convierte en empty');
    } catch (error) {
      assert(error.code === 'schedule_visibility_lookup_failed', 'el error real conserva un código diagnosticable');
      assert(error.details === 'db detail' && error.hint === 'db hint', 'el backend conserva diagnóstico para logs internos');
    }
  }

  console.log(`\nPlanner schedules: ${passed} assertions OK, ${failed} fallidas.`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
