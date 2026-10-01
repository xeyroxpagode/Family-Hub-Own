#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Client } = require('C:\\Users\\thega\\Desktop\\HomePlus\\backend\\node_modules\\pg');

const DATABASE_URL = process.env.LOCAL_DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('REMOTE_DATABASE_BLOCKED');
  process.exit(1);
}

const PREFIX = 'qa_m11_int_01_p2_r1_f04_';

async function connect() {
  const c = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  });
  await c.connect();
  return c;
}

async function asService(c, fn) {
  await c.query('set role service_role');
  try { return await fn(); } finally { await c.query('reset role'); }
}

function check(cond, msg, details) {
  assert.ok(cond, details ? `${msg}: ${JSON.stringify(details)}` : msg);
  console.log(`PASS ${msg}${details ? ' ' + JSON.stringify(details) : ''}`);
}

async function insertActorGraph(c, label) {
  const accountId = crypto.randomUUID();
  const personId = crypto.randomUUID();
  const householdId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const email = `${PREFIX}${label}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.test`;
  await c.query(
    `insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
     values ($1, 'authenticated', 'authenticated', $2, '', now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())`,
    [accountId, email],
  );
  await c.query(
    `insert into public.people (id, auth_user_id, display_name, default_language, personal_settings)
     values ($1, $2, $3, 'es-419', '{}'::jsonb)`,
    [personId, accountId, `${PREFIX}${label}`],
  );
  await c.query(
    `insert into public.households (id, name, slug, timezone, default_language, config, created_by_person_id)
     values ($1, $2, $3, 'America/Argentina/Buenos_Aires', 'es-419', '{}'::jsonb, $4)`,
    [householdId, `${PREFIX}${label}`, `${PREFIX}${label}_${householdId}`, personId],
  );
  await c.query(
    `insert into public.household_members (id, household_id, person_id, role, status, joined_at,
       household_onboarding_status, household_onboarding_completed_at)
     values ($1, $2, $3, 'coordinator', 'active', now(), 'completed', now())`,
    [memberId, householdId, personId],
  );
  await c.query(`update public.people set active_household_id = $1 where id = $2`, [householdId, personId]);
  return { accountId, personId, householdId, memberId };
}

async function reserve(c, actor, suffix, payloadHash, mutationId = `${PREFIX}mut_${suffix}`) {
  const op = `${PREFIX}op_${suffix}`;
  const key = `${PREFIX}key_${suffix}`;
  const r = await asService(c, () => c.query(
    `select public.planner_v2_reserve_idempotency(
       $1, $2, 'personal', $3, $4, 'CREATE_IDEMPOTENT', $5, $6, $7, 5
     ) as result`,
    [actor.accountId, actor.personId, actor.personId, op, key, mutationId, payloadHash],
  ));
  return { result: r.rows[0].result, key, op, mutationId, payloadHash };
}

async function expireLease(c, idempotencyId) {
  await c.query(
    `update public.planner_idempotency_keys
     set lease_expiry = now() - interval '1 hour', expires_at = now() - interval '1 hour'
     where id = $1`,
    [idempotencyId],
  );
}

async function currentState(c, id) {
  const r = await c.query(
    `select key_state, recovered_at, recovery_evidence, lease_token, lease_expiry
     from public.planner_idempotency_keys where id = $1`,
    [id],
  );
  return r.rows[0] || null;
}

function expectFailure(runFn, errMsg, expected) {
  return expectFailureInner(runFn, errMsg, expected);
}
async function expectFailureInner(fn, errMsg, expected) {
  let err = null;
  try { await fn(); } catch (e) { err = e; }
  check(Boolean(err), errMsg, err ? null : 'NO_ERROR');
  if (err && expected) {
    check(err.code === expected, `${errMsg} errcode=${expected}`,
      { got: err.code, msg: err.message });
  }
  return err;
}

async function invokeRecovery(c, args, evidence) {
  return asService(c, () => c.query(
    `select public.planner_v2_recover_idempotency($1, $2, $3, $4, $5, $6::jsonb) as result`,
    [args.id, args.accountId, args.personId, args.mutationId, args.payloadHash, evidence],
  ));
}

async function attemptRecover(c, actor, res, evidence) {
  try {
    const r = await asService(c, () => c.query(
      `select public.planner_v2_recover_idempotency($1, $2, $3, $4, $5, $6::jsonb) as result`,
      [res.result.idempotency_id, actor.accountId, actor.personId, res.mutationId, res.payloadHash, evidence],
    ));
    return { err: null, result: r.rows[0].result };
  } catch (e) {
    return { err: e, result: null };
  }
}

async function main() {
  const c = await connect();
  const summary = { effect_proven: null, no_effect_proven: null, ambiguous_cases: [] };
  try {
    // Cleanup from any previous run so this probe is idempotent in the same DB.
    await asService(c, () => c.query(
      `delete from public.planner_idempotency_keys where idempotency_key like $1`,
      [`${PREFIX}%`],
    ));
    // audit_events is append-only (trigger); we cannot delete here.
    // The final supabase reset removes everything.

    const actor = await insertActorGraph(c, 'f04');

    // ── effect_proven: expired lease + durable evidence of effect + completion missing
    const hashEP = crypto.createHash('sha256').update(`${PREFIX}ep`).digest('hex');
    const resEP = await reserve(c, actor, 'ep', hashEP);
    await expireLease(c, resEP.result.idempotency_id);
    const recEP = (await invokeRecovery(c, {
      id: resEP.result.idempotency_id, accountId: actor.accountId, personId: actor.personId,
      mutationId: resEP.mutationId, payloadHash: resEP.payloadHash,
    }, JSON.stringify({ effect_proven: true, response_status: 200, response_body: { ok: true } }))).rows[0].result;
    check(recEP.outcome === 'replay' && recEP.key_state === 'completed',
      'F04 effect_proven reconstructs -> completed', recEP);
    const stEP = await currentState(c, resEP.result.idempotency_id);
    check(stEP.key_state === 'completed', 'F04 effect_proven persisted completed', stEP);
    check(recEP.response_status === 200, 'F04 effect_proven status 200', recEP);
    // No second audit/event needed here (audit handled separately in F05)
    // Replay stable: calling reserve again should replay the completed row
    const replayEP = await asService(c, () => c.query(
      `select public.planner_v2_reserve_idempotency(
         $1, $2, 'personal', $3, $4, 'CREATE_IDEMPOTENT', $5, $6, $7, 5
       ) as result`,
      [actor.accountId, actor.personId, actor.personId, resEP.op, resEP.key, resEP.mutationId, resEP.payloadHash],
    ));
    check(replayEP.rows[0].result.outcome === 'replay', 'F04 effect_proven replay stable', replayEP.rows[0].result);
    summary.effect_proven = 'PASS';

    // ── no_effect_proven: expired lease + durable evidence of no effect -> abandoned
    const hashNE = crypto.createHash('sha256').update(`${PREFIX}ne`).digest('hex');
    const resNE = await reserve(c, actor, 'ne', hashNE);
    await expireLease(c, resNE.result.idempotency_id);
    const recNE = (await invokeRecovery(c, {
      id: resNE.result.idempotency_id, accountId: actor.accountId, personId: actor.personId,
      mutationId: resNE.mutationId, payloadHash: resNE.payloadHash,
    }, JSON.stringify({ no_effect_proven: true }))).rows[0].result;
    check(recNE.outcome === 'abandoned', 'F04 no_effect_proven -> abandoned', recNE);
    const stNE = await currentState(c, resNE.result.idempotency_id);
    check(stNE.key_state === 'abandoned', 'F04 no_effect_proven persisted abandoned', stNE);
    summary.no_effect_proven = 'PASS';

    // ── ambiguous cases — each must raise P0010 and NOT mutate state.
    const ambiguousEvidenceSet = [
      { label: 'null_evidence', evidence: null },
      { label: 'empty_object', evidence: '{}' },
      { label: 'both_absent', evidence: '{"irrelevant": "x"}' },
      { label: 'both_false', evidence: '{"effect_proven": false, "no_effect_proven": false}' },
      { label: 'both_true', evidence: '{"effect_proven": true, "no_effect_proven": true}' },
      { label: 'effect_proven_false_only', evidence: '{"effect_proven": false}' },
      { label: 'no_effect_proven_false_only', evidence: '{"no_effect_proven": false}' },
      { label: 'unknown_flags_only', evidence: '{"maybe": true}' },
      // The following vector is actually the valid `no_effect_proven=true`
      // path, NOT a contradiction. Per the R1 SQL classification:
      //   v_proven is true AND v_no_effect_proven is not true  -> reconstruct
      //   v_no_effect_proven is true AND v_proven is not true -> abandoned
      //   else -> ambiguous (P0010)
      // With effect_proven=false and no_effect_proven=true, the abandoned branch
      // triggers. Extra keys ('maybe') are ignored. This is correct behaviour,
      // verified as PASS under the no_effect_proven path, NOT ambiguous.
    ];

    for (const ev of ambiguousEvidenceSet) {
      const hashA = crypto.createHash('sha256').update(`${PREFIX}amb_${ev.label}`).digest('hex');
      const resA = await reserve(c, actor, `amb_${ev.label}`, hashA);
      // Snapshot before
      const before = await currentState(c, resA.result.idempotency_id);
      check(before.key_state === 'in_flight', `F04 ${ev.label} pre: in_flight`, before);
      // Expire
      await expireLease(c, resA.result.idempotency_id);

      // First ambiguous recovery: must raise P0010, no state change.
      const trial1 = await attemptRecover(c, actor, resA, ev.evidence);
      check(Boolean(trial1.err), `F04 ${ev.label} recovery fails closed`,
        trial1.err ? `${trial1.err.code}: ${trial1.err.message}` : 'NO_ERROR');
      check(trial1.err && trial1.err.code === 'P0010', `F04 ${ev.label} errcode=P0010`,
        trial1.err ? { got: trial1.err.code, msg: trial1.err.message } : null);
      const after1 = await currentState(c, resA.result.idempotency_id);
      check(after1.key_state === 'in_flight', `F04 ${ev.label} no state change after first attempt`,
        { before: before.key_state, after: after1.key_state, recovered_at: after1.recovered_at, recovery_evidence: after1.recovery_evidence });
      check(after1.recovered_at === null, `F04 ${ev.label} recovered_at unmodified`, after1);
      check(after1.recovery_evidence === null, `F04 ${ev.label} recovery_evidence unmodified`, after1);
      check(after1.lease_token === before.lease_token, `F04 ${ev.label} lease_token preserved`, after1);

      // Retry ambiguous again — must STILL fail closed (not abandoned)
      const trial2 = await attemptRecover(c, actor, resA, ev.evidence);
      check(Boolean(trial2.err), `F04 ${ev.label} retry still fails closed`,
        trial2.err ? null : 'NO_ERROR');
      check(trial2.err && trial2.err.code === 'P0010', `F04 ${ev.label} retry errcode=P0010`,
        trial2.err ? { got: trial2.err.code } : null);
      const after2 = await currentState(c, resA.result.idempotency_id);
      check(after2.key_state === 'in_flight', `F04 ${ev.label} retry no state change`,
        { after: after2.key_state, recovered_at: after2.recovered_at });

      summary.ambiguous_cases.push({ label: ev.label, status: 'PASS' });
    }

    // ── After ambiguous, supply effect_proven explicitly — should now reconstruct.
    const ambLabel = ambiguousEvidenceSet[0].label;
    const resA = await asService(c, () => c.query(
      `select id from public.planner_idempotency_keys where idempotency_key = $1`,
      [`${PREFIX}key_amb_${ambLabel}`],
    ));
    // Re-supply evidence_proven=true after ambiguous
    const okEvidence = JSON.stringify({ effect_proven: true, response_status: 201, response_body: { id: 'x' } });
    const id = resA.rows[0].id;
    const hashForRecovery = (await c.query(
      `select payload_hash, mutation_id from public.planner_idempotency_keys where id = $1`,
      [id],
    )).rows[0];
    const mEvidence = await asService(c, () => c.query(
      `select public.planner_v2_recover_idempotency($1, $2, $3, $4, $5, $6::jsonb) as result`,
      [id, actor.accountId, actor.personId, hashForRecovery.mutation_id, hashForRecovery.payload_hash, okEvidence],
    ));
    check(mEvidence.rows[0].result.outcome === 'replay', 'F04 after ambiguous, explicit evidence reconstructs',
      mEvidence.rows[0].result);

    console.log(JSON.stringify(summary, null, 2));
  } finally { await c.end(); }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
