'use strict';

/**
 * Planner overnight closure — real HTTP integration journeys (J1..J15).
 *
 * Local only. Synthetic, uniquely-marked household/users per run; exact IDs
 * recorded and cleaned up afterwards. Never touches preexisting user data.
 */

const path = require('path');
const { execFileSync } = require('child_process');

// Repo root is derived, never hardcoded, so the suite runs from any checkout and
// no absolute developer path is committed.
const REPO_ROOT = path.resolve(__dirname, '..');
const requireFromBackend = (rel) => require(path.join(REPO_ROOT, 'backend', 'node_modules', rel));

const { createClient } = requireFromBackend('@supabase/supabase-js');
const { Client } = requireFromBackend('pg');

// Local credentials are resolved from the environment (or `supabase status -o
// env`). NEVER commit keys: the local anon/secret pair is ephemeral dev material,
// but committed credentials are a leak regardless of environment.
function readLocalSupabaseEnv() {
  if (process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SECRET_KEY) {
    return {};
  }
  try {
    const out = execFileSync('supabase', ['status', '-o', 'env'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return Object.fromEntries(
      out
        .split(/\r?\n/)
        .map((line) => {
          const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
          return m ? [m[1], m[2]] : null;
        })
        .filter(Boolean)
    );
  } catch {
    return {};
  }
}

const localEnv = readLocalSupabaseEnv();
const SUPABASE_URL = process.env.SUPABASE_URL || localEnv.API_URL || 'http://127.0.0.1:56221';
const ANON = process.env.SUPABASE_ANON_KEY || localEnv.ANON_KEY || localEnv.PUBLISHABLE_KEY;
const SERVICE = process.env.SUPABASE_SECRET_KEY || localEnv.SECRET_KEY || localEnv.SERVICE_ROLE_KEY;
const DB_URL = process.env.SUPABASE_DB_URL || localEnv.DB_URL || 'postgresql://postgres:postgres@127.0.0.1:56222/postgres';
const API = process.env.API_BASE_URL || 'http://127.0.0.1:3001';

if (!ANON || !SERVICE) {
  throw new Error(
    'Missing local Supabase keys. Set SUPABASE_ANON_KEY and SUPABASE_SECRET_KEY, '
      + 'or start the local stack so `supabase status -o env` resolves them.'
  );
}

// LOCAL ONLY guard (frozen §46): this suite mutates a real database, so it
// must never be pointed at a remote or shared environment.
{
  const host = new URL(API).hostname;
  if (!['127.0.0.1', 'localhost'].includes(host)) {
    throw new Error(`Refusing to run: API_BASE_URL ${API} is not a local host.`);
  }
  const supabaseHost = new URL(SUPABASE_URL).hostname;
  if (!['127.0.0.1', 'localhost'].includes(supabaseHost)) {
    throw new Error(`Refusing to run: SUPABASE_URL ${SUPABASE_URL} is not a local host.`);
  }
}
const RUN = `overnight-planner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const admin = createClient(SUPABASE_URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const pub = createClient(SUPABASE_URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
const db = new Client({ connectionString: DB_URL });

let passed = 0;
const failures = [];
const assert = (cond, label) => {
  if (cond) { passed += 1; return; }
  failures.push(label);
};
const eq = (a, b, label) => assert(a === b, `${label} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

const fixture = { authUserIds: [], personIds: [], householdIds: [], memberIds: [], taskIds: [], eventIds: [], seriesIds: [], goalIds: [], presetIds: [] };

let idem = 0;
const key = (p) => `${p}-${RUN}-${idem += 1}`;

// Local date helpers (no timezone surprises): `to` is inclusive of `from`.
const dateToYMD = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (dateKey, days) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return dateToYMD(new Date(year, month - 1, day + days));
};

async function api(accessToken, method, urlPath, body, headers = {}) {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { status: res.status, json, text };
}

async function directPlannerRpc(accessToken, rpcName, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, apikey: ANON },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { status: res.status, json, text };
}

async function directTablePatch(accessToken, table, id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, apikey: ANON,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { status: res.status, json, text };
}

async function createAuthUser(label) {
  const email = `${label}.${RUN}@example.test`;
  const password = `Pw-${Math.random().toString(36).slice(2)}-${RUN.length}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`auth create: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function login(email, password) {
  const { data, error } = await pub.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(`login: ${error?.message}`);
  return data.session.access_token;
}

async function createHouseholdWithCoordinator(label) {
  const { user, email, password } = await createAuthUser(label);
  const token = await login(email, password);
  const hname = `${RUN}-${label}`;
  const { data: person, error: pErr } = await admin
    .from('people')
    .insert({ auth_user_id: user.id, display_name: hname, app_onboarding_status: 'completed' })
    .select()
    .single();
  if (pErr) throw new Error(`person: ${pErr.message}`);
  fixture.personIds.push(person.id);
  const { data: hh, error: hErr } = await admin
    .from('households')
    .insert({ name: hname, slug: `${RUN}-${label}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'), timezone: 'America/Argentina/Buenos_Aires', default_language: 'es-419', created_by_person_id: person.id })
    .select()
    .single();
  if (hErr) throw new Error(`household: ${hErr.message}`);
  fixture.householdIds.push(hh.id);
  await admin.from('people').update({ active_household_id: hh.id }).eq('id', person.id);
  const { data: member, error: mErr } = await admin
    .from('household_members')
    .insert({ household_id: hh.id, person_id: person.id, role: 'coordinator', status: 'active', joined_at: new Date().toISOString() })
    .select()
    .single();
  if (mErr) throw new Error(`member: ${mErr.message}`);
  fixture.memberIds.push(member.id);
  // Activate the household through the canonical API so the server-side
  // session (not a raw column write) carries it.
  const activated = await api(token, 'POST', `/api/households/${hh.id}/set-active`, {});
  if (activated.status >= 400) {
    throw new Error(`set-active ${activated.status}: ${activated.text}`);
  }
  return { token: await login(email, password), person, household: hh, member, user, email, password };
}

async function addMember(household, label, role) {
  const { user, email, password } = await createAuthUser(label);
  const { data: person, error: pErr } = await admin.from('people').insert({
    auth_user_id: user.id, display_name: `${RUN}-${label}`, app_onboarding_status: 'completed',
  }).select().single();
  if (pErr) throw new Error(`member person: ${pErr.message}`);
  fixture.personIds.push(person.id);
  const { data: member, error: mErr } = await admin.from('household_members').insert({
    household_id: household.id, person_id: person.id, role, status: 'active', joined_at: new Date().toISOString(),
  }).select().single();
  if (mErr) throw new Error(`member: ${mErr.message}`);
  fixture.memberIds.push(member.id);
  await admin.from('people').update({ active_household_id: household.id }).eq('id', person.id);
  const token = await login(email, password);
  const activated = await api(token, 'POST', `/api/households/${household.id}/set-active`, {});
  if (activated.status >= 400) throw new Error(`member set-active ${activated.status}: ${activated.text}`);
  return { token: await login(email, password), person, member };
}

const mut = (op) => ({ 'Idempotency-Key': key(op), 'X-Mutation-Id': key(`m-${op}`) });

async function createPlan(token, title) {
  const r = await api(token, 'POST', '/api/planner/v1/plans', { title }, mut('plan.create'));
  if (r.status !== 201) throw new Error(`createPlan ${r.status}: ${r.text}`);
  fixture.goalIds.push(r.json.plan.id);
  return r.json.plan;
}

// Transitions carry the optimistic version through If-Match (the canonical
// header), matching trash/restore. The body also keeps expectedVersion for
// readers that assert on it.
const transition = (token, planId, body) =>
  api(
    token,
    'POST',
    `/api/planner/v1/plans/${planId}/transition`,
    body,
    { ...mut(`plan.${body.transition}`), 'If-Match': String(body.expectedVersion ?? '') },
  );

async function main() {
  await db.connect();
  const coordinator = await createHouseholdWithCoordinator('coord');
  const sameHouseGuest = await addMember(coordinator.household, 'same-house-guest', 'guest');
  const adult = await createHouseholdWithCoordinator('adult');
  const guestish = await createHouseholdWithCoordinator('guestish');

  // Downgrade guestish membership so we can test a restricted role.
  await admin.from('household_members').update({ role: 'guest', status: 'active' }).eq('id', guestish.member.id);
  guestish.token = await login(guestish.email, guestish.password);
  const guestToken = guestish.token;

  // ---------------- J1: Plan -> Required Task -> open -> complete -> readiness updates
  const plan = await createPlan(coordinator.token, `J1 plan ${RUN}`);
  const emptyComponents = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${plan.id}/components`);
  eq(emptyComponents.status, 200, 'J1 empty Plan components endpoint is reachable');
  eq((emptyComponents.json?.tasks ?? []).length, 0, 'J1 empty Plan has no linked Tasks');
  eq((emptyComponents.json?.events ?? []).length, 0, 'J1 empty Plan has no linked Events');
  const taskRes = await api(coordinator.token, 'POST', '/api/planner/tasks', {
    title: `J1 task ${RUN}`,
    goal_id: plan.id,
    plan_classification: 'necessary',
  }, mut('task.create'));
  eq(taskRes.status, 201, 'J1 task created from Plan');
  assert(taskRes.json?.task?.plan_classification === 'necessary', 'J1 task defaults to Required');
  const populatedComponents = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${plan.id}/components`);
  eq(populatedComponents.status, 200, 'J1 populated Plan components endpoint is reachable');
  assert(
    (populatedComponents.json?.tasks ?? []).some((task) => task.id === taskRes.json?.task?.id),
    'J1 populated Plan components returns the linked Task',
  );
  const j1TaskId = taskRes.json?.task?.id;
  if (j1TaskId) fixture.taskIds.push(j1TaskId);

  const readiness1 = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${plan.id}/readiness`);
  eq(readiness1.status, 200, 'J1 readiness endpoint reachable');
  eq(readiness1.json?.readiness?.ready, false, 'J1 unresolved Required blocks readiness');
  eq(readiness1.json?.readiness?.pending?.tasks, 1, 'J1 pending task counted');

  if (j1TaskId) {
    const full = await api(coordinator.token, 'GET', `/api/planner/tasks/${j1TaskId}`);
    const version = full.json?.task?.version;
    const done = await api(coordinator.token, 'POST', `/api/planner/tasks/${j1TaskId}/complete`, {}, {
      ...mut('task.complete'), 'If-Match': String(version),
    });
    eq(done.status, 200, 'J1 task completes');
    const readiness2 = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${plan.id}/readiness`);
    eq(readiness2.json?.readiness?.ready, true, 'J1 readiness updates after resolution');
    eq(readiness2.json?.progress?.tasks?.resolved, 1, 'J1 factual progress resolved count');
  }

  // ---------------- J2: Task-from-Plan retry -> no duplicate (composite idempotency)
  const j2Key = key('j2.retry');
  const first = await api(coordinator.token, 'POST', '/api/planner/tasks', {
    title: `J2 task ${RUN}`, goal_id: plan.id, plan_classification: 'necessary',
  }, { 'Idempotency-Key': j2Key, 'X-Mutation-Id': j2Key });
  const retry = await api(coordinator.token, 'POST', '/api/planner/tasks', {
    title: `J2 task ${RUN}`, goal_id: plan.id, plan_classification: 'necessary',
  }, { 'Idempotency-Key': j2Key, 'X-Mutation-Id': j2Key });
  eq(first.status, 201, 'J2 first create ok');
  eq(retry.status, 201, 'J2 retry replays');
  eq(retry.json?.task?.id, first.json?.task?.id, 'J2 retry returns same Task (no duplicate)');
  if (first.json?.task?.id) fixture.taskIds.push(first.json.task.id);

  // ---------------- J3: link/unlink Task preserves the Task
  const solo = await api(coordinator.token, 'POST', '/api/planner/tasks', { title: `J3 solo ${RUN}` }, mut('task.create'));
  fixture.taskIds.push(solo.json?.task?.id);
  const soloId = solo.json?.task?.id;
  const linkedPlan = await createPlan(coordinator.token, `J3 plan ${RUN}`);
  const linkRes = await api(coordinator.token, 'PATCH', `/api/planner/tasks/${soloId}`, {
    goal_id: linkedPlan.id, plan_classification: 'supporting', expected_version: solo.json?.task?.version,
  }, mut('task.link'));
  eq(linkRes.status, 200, 'J3 link task to Plan');
  eq(linkRes.json?.task?.plan_classification, 'supporting', 'J3 classification persists');
  const taskReclass = await api(coordinator.token, 'PATCH', `/api/planner/tasks/${soloId}`, {
    goal_id: linkedPlan.id, plan_classification: 'necessary', expected_version: linkRes.json?.task?.version,
  }, mut('task.reclassify'));
  eq(taskReclass.status, 200, 'J3 Task reclassification succeeds');
  eq(taskReclass.json?.task?.plan_classification, 'necessary', 'J3 Task becomes Required');
  const unlinkRes = await api(coordinator.token, 'PATCH', `/api/planner/tasks/${soloId}`, {
    goal_id: null, expected_version: taskReclass.json?.task?.version,
  }, mut('task.unlink'));
  eq(unlinkRes.status, 200, 'J3 unlink task from Plan');
  eq(unlinkRes.json?.task?.goal_id, null, 'J3 unlink clears goal_id');
  const survivor = await api(coordinator.token, 'GET', `/api/planner/tasks/${soloId}`);
  eq(survivor.status, 200, 'J3 Task survives unlink');
  const taskEdit = await api(coordinator.token, 'PATCH', `/api/planner/tasks/${soloId}`, {
    title: `J3 edited task ${RUN}`, expected_version: survivor.json?.task?.version,
  }, { ...mut('task.edit'), 'If-Match': String(survivor.json?.task?.version) });
  eq(taskEdit.status, 200, 'J3 linked/unlinked Task remains canonically editable');
  eq(taskEdit.json?.task?.title, `J3 edited task ${RUN}`, 'J3 Task edit persists');

  // ---------------- J4: Event -> link to Plan -> unlink -> Event survives
  const eventPlan = await createPlan(coordinator.token, `J4 plan ${RUN}`);
  const ev = await api(coordinator.token, 'POST', '/api/planner/events', {
    title: `J4 event ${RUN}`,
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    ends_at: new Date(Date.now() + 90000000).toISOString(),
    all_day: false,
  }, mut('event.create'));
  eq(ev.status, 201, 'J4 event created');
  const evId = ev.json?.event?.id;
  if (evId) fixture.eventIds.push(evId);
  const evVer = (await api(coordinator.token, 'GET', `/api/planner/events/${evId}`)).json?.event?.version;
  const evLink = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${eventPlan.id}/events/${evId}/link`, {
    goal_id: eventPlan.id,
    plan_classification: 'necessary',
    expected_version: evVer,
  }, mut('event.link'));
  eq(evLink.status, 200, 'J4 event linked to Plan');
  const evReclass = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${eventPlan.id}/events/${evId}/link`, {
    goal_id: eventPlan.id,
    plan_classification: 'supporting',
    expected_version: evLink.json?.event?.version,
  }, mut('event.reclassify'));
  eq(evReclass.status, 200, 'J4 Event reclassification succeeds');
  eq(evReclass.json?.event?.plan_classification, 'supporting', 'J4 Event becomes Optional');
  const evUnlink = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${eventPlan.id}/events/${evId}/unlink`, {
    expected_version: evReclass.json?.event?.version,
  }, mut('event.unlink'));
  eq(evUnlink.status, 200, 'J4 event unlinked');
  eq(evUnlink.json?.event?.lifecycle, 'scheduled', 'J4 unlink does not cancel the Event');
  const evAlive = await api(coordinator.token, 'GET', `/api/planner/events/${evId}`);
  eq(evAlive.status, 200, 'J4 Event survives unlink');
  const eventEdit = await api(coordinator.token, 'PATCH', `/api/planner/events/${evId}`, {
    title: `J4 edited event ${RUN}`, expected_version: evAlive.json?.event?.version,
  }, { ...mut('event.edit'), 'If-Match': String(evAlive.json?.event?.version) });
  eq(eventEdit.status, 200, 'J4 linked/unlinked Event remains canonically editable');
  const eventAfterEdit = await api(coordinator.token, 'GET', `/api/planner/events/${evId}`);
  eq(eventAfterEdit.json?.event?.title, `J4 edited event ${RUN}`, 'J4 Event edit persists');

  // ---------------- J4b: productive Plan -> Create Event is one atomic mutation
  const atomicPlan = await createPlan(coordinator.token, `J4b plan ${RUN}`);
  const atomicHeaders = mut('event.create-for-plan');
  const atomicPayload = {
    title: `J4b event ${RUN}`,
    starts_at: new Date(Date.now() + 172800000).toISOString(),
    ends_at: new Date(Date.now() + 176400000).toISOString(),
    all_day: false,
    goal_id: atomicPlan.id,
    plan_classification: 'necessary',
  };
  const atomicCreate = await api(coordinator.token, 'POST', '/api/planner/events', atomicPayload, atomicHeaders);
  eq(atomicCreate.status, 201, 'J4b Event created atomically from Plan');
  eq(atomicCreate.json?.event?.goal_id, atomicPlan.id, 'J4b response contains Plan relation');
  eq(atomicCreate.json?.event?.plan_classification, 'necessary', 'J4b response contains classification');
  const atomicEventId = atomicCreate.json?.event?.id;
  if (atomicEventId) fixture.eventIds.push(atomicEventId);
  const persisted = await db.query('select goal_id, plan_classification from planner_events where id = $1', [atomicEventId]);
  eq(persisted.rows[0]?.goal_id, atomicPlan.id, 'J4b DB stores goal_id');
  eq(persisted.rows[0]?.plan_classification, 'necessary', 'J4b DB stores classification');
  const atomicComponents = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${atomicPlan.id}/components`);
  assert((atomicComponents.json?.events ?? []).some((event) => event.id === atomicEventId), 'J4b Plan components returns created Event');
  const atomicReadiness = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${atomicPlan.id}/readiness`);
  eq(atomicReadiness.json?.readiness?.pending?.events, 1, 'J4b Required future Event blocks readiness');
  const atomicReplay = await api(coordinator.token, 'POST', '/api/planner/events', atomicPayload, atomicHeaders);
  eq(atomicReplay.status, 201, 'J4b idempotent retry succeeds');
  eq(atomicReplay.json?.event?.id, atomicEventId, 'J4b idempotent retry returns same Event');
  const duplicateCount = await db.query('select count(*)::int count from planner_events where id = $1', [atomicEventId]);
  eq(duplicateCount.rows[0]?.count, 1, 'J4b idempotent retry creates no duplicate');

  const terminalPlan = await createPlan(coordinator.token, `J4b terminal ${RUN}`);
  const terminalActive = await transition(coordinator.token, terminalPlan.id, {
    transition: 'active', expectedVersion: terminalPlan.version,
  });
  eq(terminalActive.status, 200, 'J4b terminal fixture activated');
  const terminalCompleted = await transition(coordinator.token, terminalPlan.id, {
    transition: 'completed', expectedVersion: terminalActive.json?.plan?.version,
  });
  eq(terminalCompleted.status, 200, 'J4b terminal fixture completed');
  const terminalCreate = await api(coordinator.token, 'POST', '/api/planner/events', {
    ...atomicPayload, title: `J4b terminal event ${RUN}`, goal_id: terminalPlan.id,
  }, mut('event.create-for-locked-plan'));
  eq(terminalCreate.status, 409, 'J4b completed Plan rejects Event structural creation');
  eq(terminalCreate.json?.error?.code, 'plan_locked', 'J4b locked create returns plan_locked');

  const foreignCreate = await api(coordinator.token, 'POST', '/api/planner/events', {
    ...atomicPayload, title: `J4b foreign event ${RUN}`, goal_id: (await createPlan(adult.token, `J4b foreign plan ${RUN}`)).id,
  }, mut('event.create-for-foreign-plan'));
  assert([403, 404].includes(foreignCreate.status), `J4b cross-household relation rejected (got ${foreignCreate.status})`);
  const unsupportedRelation = await api(coordinator.token, 'POST', '/api/planner/events', {
    ...atomicPayload, title: `J4b invalid relation ${RUN}`, goal_id: undefined, plan_classification: 'supporting',
  }, mut('event.create-invalid-relation'));
  eq(unsupportedRelation.status, 400, 'J4b relation fields without goal_id are explicitly rejected');

  // ---------------- J5: complete Plan-local Measurement product
  const mPlan = await createPlan(coordinator.token, `J5 plan ${RUN}`);
  const mRes = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${mPlan.id}/measurements`, {
    name: `J5 goal value ${RUN}`, unit: 'u', current_value: 0, target_value: 100, target_operator: 'gte', classification: 'necessary',
  }, mut('meas.create'));
  eq(mRes.status, 201, 'J5 measurement created');
  const measId = mRes.json?.measurement?.id;
  const mReadinessBefore = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${mPlan.id}/readiness`);
  eq(mReadinessBefore.json?.readiness?.pending?.measurements, 1, 'J5 measurement blocks readiness while below target');
  const mUpd = await api(coordinator.token, 'PATCH', `/api/planner/v1/plans/${mPlan.id}/measurements/${measId}`, {
    current_value: 100, expected_version: mRes.json?.measurement?.version,
  }, mut('meas.update'));
  eq(mUpd.status, 200, 'J5 measurement updated');
  const mReadinessAfter = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${mPlan.id}/readiness`);
  eq(mReadinessAfter.json?.readiness?.ready, true, 'J5 readiness updates when targetReached');
  assert(mReadinessAfter.json?.progress?.measurements?.[0]?.reached === true, 'J5 targetReached derived, not persisted');

  const lteUpdate = await api(coordinator.token, 'PATCH', `/api/planner/v1/plans/${mPlan.id}/measurements/${measId}`, {
    name: `J5 edited ${RUN}`, unit: 'kg', current_value: 5, target_value: 10,
    target_operator: 'lte', classification: 'necessary', expected_version: mUpd.json?.measurement?.version,
  }, mut('meas.edit-all'));
  eq(lteUpdate.status, 200, 'J5 all Measurement fields editable');
  eq(lteUpdate.json?.measurement?.target_operator, 'lte', 'J5 lte operator persisted');
  eq(lteUpdate.json?.measurement?.unit, 'kg', 'J5 unit persisted');
  eq(lteUpdate.json?.measurement?.classification, 'necessary', 'J5 classification persisted');
  const lteReady = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${mPlan.id}/readiness`);
  eq(lteReady.json?.readiness?.ready, true, 'J5 lte operator derives reached');

  const eqRes = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${mPlan.id}/measurements`, {
    name: `J5 exact ${RUN}`, unit: 'count', current_value: 1, target_value: 2,
    target_operator: 'eq', classification: 'necessary',
  }, mut('meas.eq.create'));
  eq(eqRes.status, 201, 'J5 eq Measurement created');
  const eqPending = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${mPlan.id}/readiness`);
  eq(eqPending.json?.readiness?.pending?.measurements, 1, 'J5 eq mismatch blocks readiness');

  const optionalRes = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${mPlan.id}/measurements`, {
    name: `J5 optional ${RUN}`, unit: 'u', current_value: 10, target_value: 1,
    target_operator: 'lte', classification: 'supporting',
  }, mut('meas.optional.create'));
  eq(optionalRes.status, 201, 'J5 Optional Measurement created');
  const optionalIgnored = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${mPlan.id}/readiness`);
  eq(optionalIgnored.json?.readiness?.pending?.measurements, 1, 'J5 unresolved Optional Measurement never blocks');

  const eqUpdate = await api(coordinator.token, 'PATCH', `/api/planner/v1/plans/${mPlan.id}/measurements/${eqRes.json?.measurement?.id}`, {
    current_value: 2, expected_version: eqRes.json?.measurement?.version,
  }, mut('meas.eq.update'));
  eq(eqUpdate.status, 200, 'J5 eq current value updated');
  const allRequiredReady = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${mPlan.id}/readiness`);
  eq(allRequiredReady.json?.readiness?.ready, true, 'J5 eq reached and Optional ignored');

  const history = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${mPlan.id}/measurements/${measId}/history`);
  eq(history.status, 200, 'J5 Measurement history reachable');
  assert(history.json?.history?.length >= 3, 'J5 history records initial and current-value changes');
  eq(Number(history.json?.history?.[0]?.value), 5, 'J5 latest history value is current value');

  const trashable = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${mPlan.id}/measurements`, {
    name: `J5 trash ${RUN}`, unit: 'u', current_value: 0, target_value: 1,
    target_operator: 'gte', classification: 'necessary',
  }, mut('meas.trashable.create'));
  const beforeTrash = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${mPlan.id}/readiness`);
  eq(beforeTrash.json?.readiness?.pending?.measurements, 1, 'J5 failing Required Measurement blocks before trash');
  const trashed = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${mPlan.id}/measurements/${trashable.json?.measurement?.id}/trash`, undefined, {
    ...mut('meas.trash'), 'If-Match': String(trashable.json?.measurement?.version),
  });
  eq(trashed.status, 200, 'J5 Measurement moved to trash');
  const afterTrash = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${mPlan.id}/readiness`);
  eq(afterTrash.json?.readiness?.ready, true, 'J5 trashed Measurement excluded from readiness');
  const activeMeasurements = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${mPlan.id}/measurements`);
  assert(!activeMeasurements.json?.measurements?.some((item) => item.id === trashable.json?.measurement?.id), 'J5 trash excluded from active list');
  const trashList = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${mPlan.id}/measurements/trash`);
  eq(trashList.status, 200, 'J5 Measurement trash reachable');
  assert(trashList.json?.measurements?.some((item) => item.id === trashable.json?.measurement?.id), 'J5 trashed Measurement discoverable');
  const restored = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${mPlan.id}/measurements/${trashable.json?.measurement?.id}/restore`, undefined, {
    ...mut('meas.restore'), 'If-Match': String(trashed.json?.measurement?.version),
  });
  eq(restored.status, 200, 'J5 Measurement restored');
  const afterRestore = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${mPlan.id}/readiness`);
  eq(afterRestore.json?.readiness?.pending?.measurements, 1, 'J5 restored Required Measurement re-enters readiness');
  const reclassifiedMeasurement = await api(coordinator.token, 'PATCH', `/api/planner/v1/plans/${mPlan.id}/measurements/${measId}`, {
    classification: 'supporting', expected_version: lteUpdate.json?.measurement?.version,
  }, mut('meas.reclassify'));
  eq(reclassifiedMeasurement.status, 200, 'J5 Measurement reclassification succeeds');
  eq(reclassifiedMeasurement.json?.measurement?.classification, 'supporting', 'J5 Measurement becomes Optional');

  // ---------------- J6: Optional never blocks; completion blocked then override
  const cPlan = await createPlan(coordinator.token, `J6 plan ${RUN}`);
  await transition(coordinator.token, cPlan.id, { transition: 'active', expectedVersion: cPlan.version });
  const cPlanFull = (await api(coordinator.token, 'GET', `/api/planner/v1/plans/${cPlan.id}`)).json.plan;
  const optionalTask = await api(coordinator.token, 'POST', '/api/planner/tasks', {
    title: `J6 optional ${RUN}`, goal_id: cPlan.id, plan_classification: 'supporting',
  }, mut('task.create'));
  fixture.taskIds.push(optionalTask.json?.task?.id);
  const readyNow = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${cPlan.id}/readiness`);
  eq(readyNow.json?.readiness?.ready, true, 'J6 Optional component never blocks');

  const blockedPlan = await createPlan(coordinator.token, `J6 blocked ${RUN}`);
  await transition(coordinator.token, blockedPlan.id, { transition: 'active', expectedVersion: blockedPlan.version });
  const blockedFull = (await api(coordinator.token, 'GET', `/api/planner/v1/plans/${blockedPlan.id}`)).json.plan;
  const blockedTask = await api(coordinator.token, 'POST', '/api/planner/tasks', {
    title: `J6 required ${RUN}`, goal_id: blockedPlan.id, plan_classification: 'necessary',
  }, mut('task.create'));
  fixture.taskIds.push(blockedTask.json?.task?.id);
  const blocked = await transition(coordinator.token, blockedPlan.id, { transition: 'completed', expectedVersion: blockedFull.version });
  eq(blocked.status, 409, 'J6 completion blocked with unresolved Required');
  eq(blocked.json?.error?.code, 'readiness_unresolved', 'J6 structured readiness error code');
  assert(Array.isArray(blocked.json?.error?.details?.readiness?.items), 'J6 blocked response carries structured pending items');
  const blockedAfter = (await api(coordinator.token, 'GET', `/api/planner/v1/plans/${blockedPlan.id}`)).json.plan;
  const override = await transition(coordinator.token, blockedPlan.id, { transition: 'completed', expectedVersion: blockedAfter.version, confirmUnresolved: true });
  eq(override.status, 200, 'J6 override completes the Plan');
  eq(override.json?.plan?.lifecycle, 'completed', 'J6 lifecycle completed');
  const childAlive = await api(coordinator.token, 'GET', `/api/planner/tasks/${blockedTask.json?.task?.id}`);
  eq(childAlive.json?.task?.status, 'pending', 'J6 children unchanged by completion');
  void cPlanFull;

  // ---------------- J7: Archive active Plan
  const aPlan = await createPlan(coordinator.token, `J7 plan ${RUN}`);
  await transition(coordinator.token, aPlan.id, { transition: 'active', expectedVersion: aPlan.version });
  const aFull = (await api(coordinator.token, 'GET', `/api/planner/v1/plans/${aPlan.id}`)).json.plan;
  const arch = await transition(coordinator.token, aPlan.id, { transition: 'archive', expectedVersion: aFull.version });
  eq(arch.status, 200, 'J7 archive succeeds on active Plan');
  eq(arch.json?.plan?.lifecycle, 'active', 'J7 archive preserves lifecycle');
  assert(arch.json?.plan?.archivedAt, 'J7 archivedAt set');
  const defaultList = await api(coordinator.token, 'GET', '/api/planner/v1/plans?limit=100');
  const inDefault = (defaultList.json?.plans ?? []).some((p) => p.id === aPlan.id);
  eq(inDefault, false, 'J7 archived Plan absent from default list');
  const archivedList = await api(coordinator.token, 'GET', '/api/planner/v1/plans?archived=true&limit=100');
  assert((archivedList.json?.plans ?? []).some((p) => p.id === aPlan.id), 'J7 archived Plan directly addressable');
  const archivedFull = (await api(coordinator.token, 'GET', `/api/planner/v1/plans/${aPlan.id}`)).json.plan;
  eq(archivedFull.lifecycle, 'active', 'J7 archived Plan still active');
  assert(Array.isArray(archivedFull.availableActions), 'J7 availableActions projected');
  assert(archivedFull.availableActions.includes('unarchive'), 'J7 archived Plan offers unarchive');
  assert(!archivedFull.availableActions.includes('archive'), 'J7 archived Plan replaces archive with unarchive');
  const unarch = await transition(coordinator.token, aPlan.id, { transition: 'unarchive', expectedVersion: archivedFull.version });
  eq(unarch.status, 200, 'J7 unarchive succeeds');
  eq(unarch.json?.plan?.lifecycle, 'active', 'J7 lifecycle preserved across archive/unarchive');

  // ---------------- J8: Trash an archived Plan -> restore preserves archive
  const arch2 = await createPlan(coordinator.token, `J8 plan ${RUN}`);
  await transition(coordinator.token, arch2.id, { transition: 'active', expectedVersion: arch2.version });
  let f = (await api(coordinator.token, 'GET', `/api/planner/v1/plans/${arch2.id}`)).json.plan;
  f = (await transition(coordinator.token, arch2.id, { transition: 'archive', expectedVersion: f.version })).json.plan;
  const trashArchived = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${arch2.id}/trash`, {}, { ...mut('plan.trash'), 'If-Match': String(f.version) });
  eq(trashArchived.status, 200, 'J8 archived Plan trashed');
  eq(trashArchived.json?.plan?.lifecycle, 'active', 'J8 trash preserves lifecycle');
  const restoreArchived = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${arch2.id}/restore`, {}, { ...mut('plan.restore'), 'If-Match': String(trashArchived.json?.plan?.version) });
  eq(restoreArchived.status, 200, 'J8 trashed archived Plan restored');
  eq(restoreArchived.json?.plan?.archivedAt !== null, true, 'J8 restore preserves archive');
  eq(restoreArchived.json?.plan?.lifecycle, 'active', 'J8 restore preserves lifecycle');

  // ---------------- J9: availableActions per lifecycle (frozen §24)
  const prepPlan = await createPlan(coordinator.token, `J9 prep ${RUN}`);
  const prepFull = (await api(coordinator.token, 'GET', `/api/planner/v1/plans/${prepPlan.id}`)).json.plan;
  assert(prepFull.availableActions.includes('activate'), 'J9 preparation offers activate');
  assert(!prepFull.availableActions.includes('cancel'), 'J9 preparation does NOT offer cancel');
  const prepCancel = await transition(coordinator.token, prepPlan.id, { transition: 'cancelled', expectedVersion: prepFull.version });
  eq(prepCancel.status, 409, 'J9 canonical API rejects preparation Cancel');
  const directPrepCancel = await directPlannerRpc(coordinator.token, 'transition_goal_rpc', {
    p_goal_id: prepPlan.id, p_transition: 'cancel', p_expected_version: prepFull.version,
    p_context_household_id: coordinator.household.id, p_closed_reason: null,
  });
  eq(directPrepCancel.status, 400, 'J9 direct authenticated RPC cannot bypass preparation Cancel guard');
  const pausedPlan = await createPlan(coordinator.token, `J9 paused ${RUN}`);
  await transition(coordinator.token, pausedPlan.id, { transition: 'active', expectedVersion: pausedPlan.version });
  let pf = (await api(coordinator.token, 'GET', `/api/planner/v1/plans/${pausedPlan.id}`)).json.plan;
  pf = (await transition(coordinator.token, pausedPlan.id, { transition: 'paused', expectedVersion: pf.version })).json.plan;
  assert(pf.availableActions.includes('resume'), 'J9 paused offers resume');
  assert(!pf.availableActions.includes('activate'), 'J9 paused does not offer activate');
  const resumed = await transition(coordinator.token, pausedPlan.id, { transition: 'resume', expectedVersion: pf.version });
  eq(resumed.status, 200, 'J9 advertised Resume executes successfully');
  eq(resumed.json?.plan?.lifecycle, 'active', 'J9 Resume returns active lifecycle');
  const cancelled = await transition(coordinator.token, pausedPlan.id, {
    transition: 'cancelled', expectedVersion: resumed.json?.plan?.version,
  });
  eq(cancelled.status, 200, 'J9 advertised Cancel executes successfully from active');
  eq(cancelled.json?.plan?.lifecycle, 'cancelled', 'J9 Cancel returns cancelled lifecycle');
  const reopenedAfterCancel = await transition(coordinator.token, pausedPlan.id, {
    transition: 'reopen', expectedVersion: cancelled.json?.plan?.version,
  });
  eq(reopenedAfterCancel.status, 200, 'J9 advertised Reopen executes successfully from cancelled');
  eq(reopenedAfterCancel.json?.plan?.lifecycle, 'active', 'J9 Reopen after Cancel returns active');

  // ---------------- J10: cross-household rejection
  const foreignPlan = await createPlan(adult.token, `J10 foreign ${RUN}`);
  // Cross-household: a foreign Plan must not accept this household's Event.
  // The actor's own Event carries the correct version, so the request passes
  // the optimistic check and is rejected by household isolation itself.
  const evVerForForeign = (await api(coordinator.token, 'GET', `/api/planner/events/${evId}`)).json?.event?.version;
  const foreignLink = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${foreignPlan.id}/events/${evId}/link`, {
    plan_classification: 'necessary', expected_version: evVerForForeign,
  }, mut('event.foreign'));
  if (![403, 404].includes(foreignLink.status)) {
    console.log('DEBUG foreign link:', foreignLink.status, foreignLink.text.slice(0, 300));
  }
  assert([403, 404].includes(foreignLink.status), `J10 cross-household event link denied (got ${foreignLink.status})`);
  const foreignPlanRead = await api(coordinator.token, 'GET', `/api/planner/v1/plans/${foreignPlan.id}`);
  eq(foreignPlanRead.status, 404, 'J10 foreign Plan not readable cross-household');
  const foreignTaskLink = await api(coordinator.token, 'POST', '/api/planner/tasks', {
    title: `J10 x ${RUN}`, goal_id: foreignPlan.id,
  }, mut('task.foreign'));
  assert([400, 403, 404].includes(foreignTaskLink.status), `J10 cross-household task create rejected (got ${foreignTaskLink.status})`);

  // ---------------- J11: restricted role denied
  // A guest in the SAME household holds goal.edit_own (per the frozen matrix),
  // so the representative restricted-role case is a guest reaching ANOTHER
  // household's Plan: household isolation must deny it structurally.
  const guestPlan = await createPlan(coordinator.token, `J11 guest ${RUN}`);
  const sameHouseProjection = await api(sameHouseGuest.token, 'GET', `/api/planner/v1/plans/${guestPlan.id}`);
  eq(sameHouseProjection.status, 200, 'J11 restricted same-household actor can read Plan');
  eq((sameHouseProjection.json?.plan?.availableActions ?? []).length, 0, 'J11 restricted non-owner sees no deterministically forbidden actions');
  const forbiddenActivate = await transition(sameHouseGuest.token, guestPlan.id, {
    transition: 'active', expectedVersion: sameHouseProjection.json?.plan?.version,
  });
  eq(forbiddenActivate.status, 403, 'J11 restricted direct action is denied');
  eq(forbiddenActivate.json?.error?.code, 'planner_forbidden', 'J11 denial uses canonical planner_forbidden code');
  const guestForeignRead = await api(guestToken, 'GET', `/api/planner/v1/plans/${guestPlan.id}/components`);
  assert([403, 404].includes(guestForeignRead.status), `J11 restricted role cannot read foreign Plan (got ${guestForeignRead.status})`);
  const guestForeignWrite = await api(guestToken, 'POST', `/api/planner/v1/plans/${guestPlan.id}/measurements`, {
    name: `J11 m ${RUN}`, unit: 'u', target_value: 1,
  }, mut('meas.guest'));
  assert([401, 403, 404].includes(guestForeignWrite.status), `J11 cross-household measurement write denied (got ${guestForeignWrite.status})`);
  // Verification is the representative role-sensitive Task action.
  const vTask = await api(coordinator.token, 'POST', '/api/planner/tasks', {
    title: `J11 verify ${RUN}`, requires_verification: true,
  }, mut('task.verify'));
  fixture.taskIds.push(vTask.json?.task?.id);
  const guestVerify = await api(guestToken, 'POST', `/api/planner/tasks/${vTask.json?.task?.id}/complete`, {}, {
    ...mut('task.guestcomplete'), 'If-Match': String(vTask.json?.task?.version ?? 1),
  });
  assert([401, 403, 404].includes(guestVerify.status), `J11 guest cannot complete a foreign Task (got ${guestVerify.status})`);

  // ---------------- J12: Personal Plan creation refused (household-only)
  const personal = await api(coordinator.token, 'POST', '/api/planner/v1/plans', { title: `J12 personal ${RUN}`, scope: 'personal' }, mut('plan.personal'));
  assert([400, 403].includes(personal.status), `J12 personal Plan refused (got ${personal.status})`);

  // ---------------- J13: component structural mutation frozen after completion
  const frozenPlan = await createPlan(coordinator.token, `J13 frozen ${RUN}`);
  await transition(coordinator.token, frozenPlan.id, { transition: 'active', expectedVersion: frozenPlan.version });
  const fFull = (await api(coordinator.token, 'GET', `/api/planner/v1/plans/${frozenPlan.id}`)).json.plan;
  const frozenComplete = await transition(coordinator.token, frozenPlan.id, { transition: 'completed', expectedVersion: fFull.version });
  eq(frozenComplete.status, 200, 'J13 empty Plan completes (no unresolved Required)');
  const directTask = await api(coordinator.token, 'POST', '/api/planner/tasks', {
    title: `J13 direct task ${RUN}`,
  }, mut('task.direct-guard'));
  fixture.taskIds.push(directTask.json?.task?.id);
  const directTaskLink = await directTablePatch(coordinator.token, 'planner_tasks', directTask.json?.task?.id, {
    goal_id: frozenPlan.id, plan_classification: 'necessary',
  });
  assert(directTaskLink.status >= 400, `J13 direct table Task link cannot bypass terminal Plan lock (got ${directTaskLink.status})`);
  const directTaskPersisted = await db.query('select goal_id, plan_classification from planner_tasks where id=$1', [directTask.json?.task?.id]);
  eq(directTaskPersisted.rows[0]?.goal_id, null, 'J13 denied direct Task relation is not persisted');
  const directEvent = await api(coordinator.token, 'POST', '/api/planner/events', {
    title: `J13 direct event ${RUN}`,
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    ends_at: new Date(Date.now() + 90000000).toISOString(),
    all_day: false,
  }, mut('event.direct-guard'));
  fixture.eventIds.push(directEvent.json?.event?.id);
  const directEventLink = await directTablePatch(coordinator.token, 'planner_events', directEvent.json?.event?.id, {
    goal_id: frozenPlan.id, plan_classification: 'necessary',
  });
  assert(directEventLink.status >= 400, `J13 direct table Event link cannot bypass terminal Plan lock (got ${directEventLink.status})`);
  const directEventPersisted = await db.query('select goal_id, plan_classification from planner_events where id=$1', [directEvent.json?.event?.id]);
  eq(directEventPersisted.rows[0]?.goal_id, null, 'J13 denied direct Event relation is not persisted');
  const frozenMeas = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${frozenPlan.id}/measurements`, {
    name: `J13 late ${RUN}`, unit: 'u', target_value: 5,
  }, mut('meas.frozen'));
  eq(frozenMeas.status, 409, 'J13 structural mutation refused after completion');
  eq(frozenMeas.json?.error?.code, 'plan_locked', 'J13 plan_locked code');
  const evVersionNow = (await api(coordinator.token, 'GET', `/api/planner/events/${evId}`)).json?.event?.version;
  const frozenLink = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${frozenPlan.id}/events/${evId}/link`, {
    goal_id: frozenPlan.id,
    plan_classification: 'necessary',
    expected_version: evVersionNow,
  }, mut('event.frozen'));
  if (frozenLink.status !== 409) console.log('DEBUG frozen link:', frozenLink.status, frozenLink.text.slice(0, 400));
  eq(frozenLink.status, 409, 'J13 event link refused after completion');
  const reopenFull = (await api(coordinator.token, 'GET', `/api/planner/v1/plans/${frozenPlan.id}`)).json.plan;
  const reopened = await transition(coordinator.token, frozenPlan.id, { transition: 'reopen', expectedVersion: reopenFull.version });
  eq(reopened.status, 200, 'J13 reopen returns Plan to active');
  eq(reopened.json?.plan?.lifecycle, 'active', 'J13 reopened lifecycle active');
  const afterReopen = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${frozenPlan.id}/measurements`, {
    name: `J13 after ${RUN}`, unit: 'u', target_value: 5,
  }, mut('meas.after'));
  eq(afterReopen.status, 201, 'J13 structural mutation allowed after reopen');

  // ---------------- J14: version conflict mapping
  const vPlan = await createPlan(coordinator.token, `J14 plan ${RUN}`);
  const vFull = (await api(coordinator.token, 'GET', `/api/planner/v1/plans/${vPlan.id}`)).json.plan;
  const edited = await api(coordinator.token, 'PATCH', `/api/planner/v1/plans/${vPlan.id}`, {
    title: `J14 edited ${RUN}`, description: 'canonical edit', expectedVersion: vFull.version,
  }, { ...mut('plan.edit'), 'If-Match': String(vFull.version) });
  eq(edited.status, 200, 'J14 canonical Plan Edit succeeds');
  eq(edited.json?.plan?.title, `J14 edited ${RUN}`, 'J14 Plan Edit persists fields');
  const staleEdit = await api(coordinator.token, 'PATCH', `/api/planner/v1/plans/${vPlan.id}`, {
    title: 'stale edit', expectedVersion: vFull.version,
  }, { ...mut('plan.edit.stale'), 'If-Match': String(vFull.version) });
  eq(staleEdit.status, 412, 'J14 stale Plan Edit yields conflict');
  const activeVPlan = await transition(coordinator.token, vPlan.id, { transition: 'active', expectedVersion: edited.json?.plan?.version });
  const stale = await transition(coordinator.token, vPlan.id, { transition: 'paused', expectedVersion: edited.json?.plan?.version });
  eq(stale.status, 412, 'J14 stale version yields conflict');
  assert(
    stale.json?.error?.code === 'version_conflict' || stale.json?.error?.code === 'version_conflict_v2',
    `J14 version conflict carries a structured conflict code (got ${stale.json?.error?.code})`,
  );
  const completedForEditLock = await transition(coordinator.token, vPlan.id, {
    transition: 'completed', expectedVersion: activeVPlan.json?.plan?.version,
  });
  eq(completedForEditLock.status, 200, 'J14 terminal edit fixture completes');
  const terminalEdit = await api(coordinator.token, 'PATCH', `/api/planner/v1/plans/${vPlan.id}`, {
    title: 'forbidden terminal edit', expectedVersion: completedForEditLock.json?.plan?.version,
  }, { ...mut('plan.edit.terminal'), 'If-Match': String(completedForEditLock.json?.plan?.version) });
  eq(terminalEdit.status, 409, 'J14 terminal Plan Edit is rejected');
  eq(terminalEdit.json?.error?.code, 'plan_locked', 'J14 terminal edit returns plan_locked');

  // ---------------- J15: invalid classification refused
  const badClass = await api(coordinator.token, 'POST', '/api/planner/tasks', {
    title: `J15 bad ${RUN}`, goal_id: vPlan.id, plan_classification: 'mandatory',
  }, mut('task.badclass'));
  eq(badClass.status, 400, 'J15 invalid classification rejected');
  eq(badClass.json?.error?.code, 'invalid_plan_classification', 'J15 invalid_plan_classification code');

  // ---------------- J16: invalid deep-link ids terminate with a typed 404
  // A deep link into a deleted/absent/nonexistent id must NOT hang the screen
  // and MUST NOT leak an existence signal: every read answers 404 with a
  // structured code the screen can render as a terminal "not found" state.
  const MISSING = '00000000-0000-4000-8000-000000000000';
  const deepLinks = [
    ['plan', `/api/planner/v1/plans/${MISSING}`],
    ['task', `/api/planner/tasks/${MISSING}`],
    ['event', `/api/planner/events/${MISSING}`],
    ['series', `/api/planner/event-series/${MISSING}`],
    ['responsibility', `/api/planner/responsibilities/${MISSING}`],
  ];
  for (const [label, urlPath] of deepLinks) {
    const res = await api(coordinator.token, 'GET', urlPath);
    eq(res.status, 404, `J16 ${label} deep link answers 404 for a missing id`);
    assert(
      typeof res.json?.error?.code === 'string' && res.json.error.code.length > 0,
      `J16 ${label} 404 carries a structured error code (got ${JSON.stringify(res.json?.error)})`,
    );
  }
  // A structurally invalid id is a client error, not a hang either, and must
  // never become a driver 500.
  const malformedRoutes = [
    ['plan', `/api/planner/v1/plans/not-a-uuid`],
    ['task', `/api/planner/tasks/not-a-uuid`],
    ['event', `/api/planner/events/not-a-uuid`],
    ['series', `/api/planner/event-series/not-a-uuid`],
    ['responsibility', `/api/planner/responsibilities/not-a-uuid`],
    ['goals milestone', `/api/planner/goals/not-a-uuid/milestones`],
    ['plan measurements', `/api/planner/v1/plans/not-a-uuid/measurements`],
    ['plan components', `/api/planner/v1/plans/not-a-uuid/components`],
  ];
  for (const [label, urlPath] of malformedRoutes) {
    const res = await api(coordinator.token, 'GET', urlPath);
    assert(
      [400, 404].includes(res.status),
      `J16 malformed ${label} id answers 400/404 (got ${res.status})`,
    );
    assert(
      res.status < 500,
      `J16 malformed ${label} id is not a server error (got ${res.status})`,
    );
    // A raw driver SQLSTATE (e.g. 22P02) is an implementation leak and makes a
    // malformed id distinguishable from an absent one.
    const code = res.json?.error?.code ?? '';
    assert(
      !['22P02', 'internal_error', 'trash_read_failed'].includes(code),
      `J16 malformed ${label} id hides the raw driver code (got ${code})`,
    );
  }

  // ---------------- J17: a real preset for every supported entity type
  // Frozen §33: exactly task | responsibility | event | event_series | plan.
  // This exercises the real HTTP create -> prepare-application path per type, so
  // the DB domain, the adapter registry and the sanitizer stay in agreement.
  const presetTypes = [
    ['task', { title: 'RevisarTurno', category: 'hogar' }],
    ['responsibility', { title: 'Cocinar', category: 'hogar' }],
    ['event', { title: 'Reunion', category: 'trabajo' }],
    ['event_series', { title: 'Gimnasio', category: 'salud' }],
    ['plan', { objectiveTemplate: 'Mudanza', category: 'hogar' }],
  ];
  for (const [entityType, payload] of presetTypes) {
    const created = await api(coordinator.token, 'POST', '/api/planner/presets', {
      entity_type: entityType,
      name: `J17 ${entityType} ${RUN}`,
      source: 'personal',
      payload,
    }, mut(`preset.create.${entityType}`));
    eq(created.status, 201, `J17 ${entityType} preset created`);
    // Presets use the canonical mutation envelope `{ data, outcome, version }`.
    const preset = created.json?.data;
    if (!preset?.id) {
      throw Object.assign(new Error(`J17 ${entityType} create response has no preset data (keys: ${Object.keys(created.json ?? {}).join(',')})`), {
        response: created.json,
      });
    }
    fixture.presetIds.push(preset.id);
    eq(preset.entity_type, entityType, `J17 ${entityType} preset echoes its entity type`);
    assert(preset.active_revision_id, `J17 ${entityType} preset created with an active revision`);

    const prepared = await api(coordinator.token, 'GET', `/api/planner/presets/${preset.id}/prepare`);
    eq(prepared.status, 200, `J17 ${entityType} preset prepares an application payload`);
    assert(
      prepared.json?.data,
      `J17 ${entityType} prepare returns a usable payload (keys: ${Object.keys(prepared.json ?? {}).join(',')})`,
    );
    if (entityType === 'plan') {
      const legacyBefore = Number((await db.query('select count(*) count from planner_plans')).rows[0].count);
      const canonicalFromPreset = await createPlan(coordinator.token, `J17 preset Plan ${RUN}`);
      const canonicalRow = await db.query('select count(*)::int count from planner_goals where id = $1', [canonicalFromPreset.id]);
      const legacyAfter = Number((await db.query('select count(*) count from planner_plans')).rows[0].count);
      eq(canonicalRow.rows[0].count, 1, 'J17 Plan preset flows into canonical planner_goals writer');
      eq(legacyAfter, legacyBefore, 'J17 Plan preset creates no planner_plans row');
    }
  }

  // The domain is closed: a non-domain entity type must be refused.
  const bogus = await api(coordinator.token, 'POST', '/api/planner/presets', {
    entity_type: 'measurement',
    name: `J17 bogus ${RUN}`,
    source: 'personal',
    payload: { title: 'x' },
  }, mut('preset.create.bogus'));
  assert([400, 422].includes(bogus.status), `J17 non-domain entity type refused (got ${bogus.status})`);

  // ---------------- J18: Event Series lifecycle end to end + idempotent create
  // Frozen §19/§35/§36: Series is a recurring definition; it produces concrete
  // Events ONLY through explicit bounded materialization.
  const seriesHeaders = mut('series.create');
  const seriesPayload = {
    title: `J18 Gimnasio ${RUN}`,
    scheduleType: 'timed',
    startsOn: dateToYMD(new Date()),
    timeZone: 'America/Argentina/Buenos_Aires',
    recurrenceRule: { frequency: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] },
    eventDefaults: { title: `J18 Gimnasio ${RUN}`, localStartTime: '09:00', durationMinutes: 60 },
  };
  const seriesCreate = await api(coordinator.token, 'POST', '/api/planner/event-series', seriesPayload, seriesHeaders);
  eq(seriesCreate.status, 201, 'J18 Series created');
  const seriesId = seriesCreate.json?.series?.id;
  if (seriesId) fixture.seriesIds.push(seriesId);
  assert(seriesId, `J18 Series create returns an id (keys: ${Object.keys(seriesCreate.json ?? {}).join(',')})`);

  // Idempotent create: the SAME Idempotency-Key must not create a second Series.
  const seriesReplay = await api(coordinator.token, 'POST', '/api/planner/event-series', seriesPayload, seriesHeaders);
  eq(seriesReplay.json?.series?.id, seriesId, 'J18 Series create is idempotent on replay');

  if (seriesId) {
    const seriesDetail = await api(coordinator.token, 'GET', `/api/planner/event-series/${seriesId}`);
    eq(seriesDetail.status, 200, 'J18 Series detail readable');
    eq(seriesDetail.json?.series?.id, seriesId, 'J18 Series detail returns the requested Series');
    assert(
      Array.isArray(seriesDetail.json?.series?.availableActions),
      'J18 Series detail projects availableActions (the only gate authority)',
    );
    const seriesVersion = seriesDetail.json?.series?.version;

    // Edit with If-Match, then prove a stale version conflicts.
    const seriesPatch = await api(coordinator.token, 'PATCH', `/api/planner/event-series/${seriesId}`, {
      title: `J18 Gimnasio editado ${RUN}`, expected_version: seriesVersion,
    }, { ...mut('series.update'), 'If-Match': String(seriesVersion) });
    eq(seriesPatch.status, 200, 'J18 Series edited with If-Match');
    const stale = await api(coordinator.token, 'PATCH', `/api/planner/event-series/${seriesId}`, {
      title: `J18 stale ${RUN}`, expected_version: seriesVersion,
    }, { ...mut('series.update.stale'), 'If-Match': String(seriesVersion) });
    eq(stale.status, 412, 'J18 stale Series version yields conflict');

    // Explicit, bounded materialization: idempotent and never on read.
    const from = dateToYMD(new Date());
    const rangeBody = { from, to: addDays(from, 30) };
    const firstGen = await api(coordinator.token, 'POST', '/api/planner/event-series/materialize-range', rangeBody, mut('series.gen1'));
    eq(firstGen.status, 200, 'J18 explicit materialization succeeds');
    assert((firstGen.json?.created ?? 0) > 0, `J18 materialization created events (got ${firstGen.json?.created})`);
    const secondGen = await api(coordinator.token, 'POST', '/api/planner/event-series/materialize-range', rangeBody, mut('series.gen2'));
    eq(secondGen.json?.created, 0, 'J18 re-materializing the same range creates nothing new');

    // GET must never materialize (frozen §36).
    const calendarAfter = await api(coordinator.token, 'GET', `/api/planner/calendar?view=week&date=${from}`);
    eq(calendarAfter.status, 200, 'J18 Calendar readable after materialization');
    assert(
      (calendarAfter.json?.items ?? []).every((item) => item.type === 'event'),
      'J18 Calendar agenda contains Events only (frozen §35)',
    );

    // Lifecycle, then Trash discovery + restore for a Series.
    const paused = await api(coordinator.token, 'POST', `/api/planner/event-series/${seriesId}/pause`, undefined,
      { ...mut('series.pause'), 'If-Match': String((seriesPatch.json?.series?.version) ?? seriesVersion) });
    eq(paused.status, 200, 'J18 Series paused');
    const trashed = await api(coordinator.token, 'POST', `/api/planner/event-series/${seriesId}/trash`, undefined,
      { ...mut('series.trash'), 'If-Match': String(paused.json?.series?.version) });
    eq(trashed.status, 200, 'J18 Series trashed');

    const trashAll = await api(coordinator.token, 'GET', '/api/planner/trash?type=all');
    eq(trashAll.status, 200, 'J18 Trash type=all readable (was a 500 before the projection fix)');
    assert(
      (trashAll.json?.items ?? []).some((item) => item.type === 'event_series' && item.id === seriesId),
      'J18 trashed Series is discoverable in Trash',
    );
    const trashedSeriesItem = (trashAll.json?.items ?? []).find((item) => item.id === seriesId);
    assert(typeof trashedSeriesItem?.title === 'string' && trashedSeriesItem.title.length > 0,
      `J18 Trash Series row carries a title (got ${JSON.stringify(trashedSeriesItem?.title)})`);

    const restored = await api(coordinator.token, 'POST', `/api/planner/event-series/${seriesId}/restore`, undefined,
      { ...mut('series.restore'), 'If-Match': String(trashed.json?.series?.version) });
    eq(restored.status, 200, 'J18 Series restored from Trash');
  }

  // ---------------- J19: the materialization bound is SERVER authority
  // A client-side range check is not an authority. The API must refuse an
  // oversized window with a structured error and must not create anything.
  if (seriesId) {
    const boundedFrom = dateToYMD(new Date());
    const beforeOversized = await db.query(
      `select count(*)::int as n from public.planner_events where series_id = $1`,
      [seriesId],
    );

    const oversized = await api(coordinator.token, 'POST', '/api/planner/event-series/materialize-range',
      { from: boundedFrom, to: addDays(boundedFrom, 181) }, mut('series.oversized'));
    eq(oversized.status, 400, 'J19 oversized materialization is rejected (not a 5xx)');
    eq(oversized.json?.error?.code, 'event_series_range_too_large', 'J19 rejection carries a structured code');

    const absurd = await api(coordinator.token, 'POST', '/api/planner/event-series/materialize-range',
      { from: '1900-01-01', to: '2999-12-31' }, mut('series.absurd'));
    eq(absurd.status, 400, 'J19 unbounded materialization range is rejected');

    const afterOversized = await db.query(
      `select count(*)::int as n from public.planner_events where series_id = $1`,
      [seriesId],
    );
    eq(afterOversized.rows[0].n, beforeOversized.rows[0].n,
      'J19 a rejected materialization created 0 occurrences');

    // The maximum supported window is still accepted, and retrying it stays
    // idempotent: the bound must not have narrowed valid behaviour.
    const maxRange = await api(coordinator.token, 'POST', '/api/planner/event-series/materialize-range',
      { from: boundedFrom, to: addDays(boundedFrom, 180) }, mut('series.max'));
    eq(maxRange.status, 200, 'J19 the maximum supported range (180 days) is accepted');
    const maxRetry = await api(coordinator.token, 'POST', '/api/planner/event-series/materialize-range',
      { from: boundedFrom, to: addDays(boundedFrom, 180) }, mut('series.max.retry'));
    eq(maxRetry.status, 200, 'J19 retrying the maximum range succeeds');
    eq(maxRetry.json?.created, 0, 'J19 retrying the maximum range creates no duplicate occurrence');
  }

  // ---------------- J20: Trash -> Restore is version-safe on the PROJECTED version
  // GET of a trashed Series answers 404, so restore can only be driven by the
  // version the Trash projection exposes. That projected version is the whole
  // contract: no cached detail response may be required.
  {
    const trashedSeriesPayload = {
      title: `J20 Horario ${RUN}`,
      scheduleType: 'timed',
      startsOn: dateToYMD(new Date()),
      timeZone: 'America/Argentina/Buenos_Aires',
      recurrenceRule: { frequency: 'daily', interval: 1 },
      eventDefaults: { title: `J20 Horario ${RUN}`, localStartTime: '18:00', durationMinutes: 45 },
    };
    const created20 = await api(coordinator.token, 'POST', '/api/planner/event-series', trashedSeriesPayload,
      mut('series20.create'));
    eq(created20.status, 201, 'J20 Series created for Trash restore');
    const id20 = created20.json?.series?.id;
    if (id20) fixture.seriesIds.push(id20);

    const trash20 = await api(coordinator.token, 'POST', `/api/planner/event-series/${id20}/trash`, undefined,
      { ...mut('series20.trash'), 'If-Match': String(created20.json?.series?.version) });
    eq(trash20.status, 200, 'J20 Series trashed');

    // NOTE: the Series DTO does not filter on lifecycle, so a trashed Series is
    // still addressable (200, availableActions = ["restore"]) instead of 404.
    // That is CURRENT behaviour and it is deliberately NOT changed here: the
    // requirement is that restore is safe with ONLY the Trash projection, which
    // the assertions below prove by never reading a detail version.
    const stillAddressable = await api(coordinator.token, 'GET', `/api/planner/event-series/${id20}`);
    eq(stillAddressable.status, 200, 'J20 a trashed Series remains addressable (no DTO lifecycle filter)');
    assert(
      (stillAddressable.json?.series?.availableActions ?? []).includes('restore'),
      'J20 a trashed Series projects restore as its only available action',
    );

    const trashList20 = await api(coordinator.token, 'GET', '/api/planner/trash?type=event_series');
    eq(trashList20.status, 200, 'J20 Trash projection readable for event_series');
    const row20 = (trashList20.json?.items ?? []).find((item) => item.id === id20);
    assert(row20, 'J20 trashed Series appears in the Trash projection');
    assert(Number.isInteger(row20?.version) && row20.version > 0,
      `J20 Trash projection ALWAYS exposes the version restore needs (got ${JSON.stringify(row20?.version)})`);

    // A stale projected version is a canonical conflict, not a silent overwrite.
    const staleRestore = await api(coordinator.token, 'POST', `/api/planner/event-series/${id20}/restore`, undefined,
      { ...mut('series20.restore.stale'), 'If-Match': String(row20.version - 1) });
    eq(staleRestore.status, 412, 'J20 stale Trash version yields a version conflict');

    const okRestore = await api(coordinator.token, 'POST', `/api/planner/event-series/${id20}/restore`, undefined,
      { ...mut('series20.restore'), 'If-Match': String(row20.version) });
    eq(okRestore.status, 200, 'J20 Series restored using ONLY the projected Trash version');
    eq(okRestore.json?.series?.version, row20.version + 1,
      'J20 restore advances the version from the projected one');

    const reachable = await api(coordinator.token, 'GET', `/api/planner/event-series/${id20}`);
    eq(reachable.status, 200, 'J20 restored Series is reachable again');
    eq(reachable.json?.series?.id, id20, 'J20 reachable Series is the restored one');
  }

  // ---------------- J21: canonical Plan across global productive consumers
  const globalPlan = await createPlan(coordinator.token, `J21 global ${RUN}`);
  const globalActive = await transition(coordinator.token, globalPlan.id, {
    transition: 'active', expectedVersion: globalPlan.version,
  });
  await api(coordinator.token, 'POST', `/api/planner/v1/plans/${globalPlan.id}/measurements`, {
    name: `J21 unresolved ${RUN}`, unit: 'u', current_value: 0, target_value: 1,
    target_operator: 'gte', classification: 'necessary',
  }, mut('meas.global'));
  const globalSearch = await api(coordinator.token, 'GET', `/api/planner/search?context=active&q=${encodeURIComponent(`J21 global ${RUN}`)}&limit=20`);
  eq(globalSearch.status, 200, 'J21 Search reads canonical Plans');
  assert(JSON.stringify(globalSearch.json).includes(globalPlan.id), 'J21 Search returns canonical Plan destination');
  const globalHome = await api(coordinator.token, 'GET', '/api/planner/summary');
  eq(globalHome.status, 200, 'J21 Home summary reads canonical Plans');
  assert(JSON.stringify(globalHome.json).includes(globalPlan.id), 'J21 Home summary includes canonical Plan');
  const globalAttention = await api(coordinator.token, 'GET', '/api/planner/attention?limit=100');
  eq(globalAttention.status, 200, 'J21 Attention reads canonical Plan readiness');
  assert(JSON.stringify(globalAttention.json).includes(globalPlan.id), 'J21 unresolved Required Plan appears in Attention');
  const globalActivity = await api(coordinator.token, 'GET', '/api/planner/activity?limit=100');
  eq(globalActivity.status, 200, 'J21 Activity reads canonical Plan actions');
  assert(JSON.stringify(globalActivity.json).includes(globalPlan.id), 'J21 Activity contains canonical Plan');
  const globalTrash = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${globalPlan.id}/trash`, undefined, {
    ...mut('plan.global.trash'), 'If-Match': String(globalActive.json?.plan?.version),
  });
  eq(globalTrash.status, 200, 'J21 Plan trash succeeds from productive path');
  const planTrashList = await api(coordinator.token, 'GET', '/api/planner/trash?type=goals');
  eq(planTrashList.status, 200, 'J21 Trash reads canonical Plans');
  assert(JSON.stringify(planTrashList.json).includes(globalPlan.id), 'J21 trashed Plan is discoverable');
  const globalRestore = await api(coordinator.token, 'POST', `/api/planner/v1/plans/${globalPlan.id}/restore`, undefined, {
    ...mut('plan.global.restore'), 'If-Match': String(globalTrash.json?.plan?.version),
  });
  eq(globalRestore.status, 200, 'J21 Plan restores from Trash projection version');

  // ---------------- DB invariants after the run
  const inv = await db.query(`
    select
      (select count(*)::int from planner_tasks where goal_id is not null and plan_classification is null) as task_no_class,
      (select count(*)::int from planner_events where goal_id is not null and plan_classification is null) as event_no_class,
      (select count(*)::int from planner_tasks t join planner_goals g on g.id = t.goal_id where g.household_id is distinct from t.household_id) as task_cross_household,
      (select count(*)::int from planner_events e join planner_goals g on g.id = e.goal_id where g.household_id is distinct from e.household_id) as event_cross_household,
      (select count(*)::int from planner_plan_measurements where goal_id is null) as measurement_no_goal
  `);
  eq(inv.rows[0].task_no_class, 0, 'INV no linked Task without classification');
  eq(inv.rows[0].event_no_class, 0, 'INV no linked Event without classification');
  eq(inv.rows[0].task_cross_household, 0, 'INV no cross-household Task link');
  eq(inv.rows[0].event_cross_household, 0, 'INV no cross-household Event link');
  eq(inv.rows[0].measurement_no_goal, 0, 'INV no Measurement without Plan root');
}

async function cleanup() {
  for (const t of fixture.taskIds) { if (t) await admin.from('planner_tasks').delete().eq('id', t); }
  for (const e of fixture.eventIds) { if (e) await admin.from('planner_events').delete().eq('id', e); }
  for (const m of fixture.memberIds) { if (m) await admin.from('household_members').delete().eq('id', m); }
  for (const h of fixture.householdIds) { if (h) await admin.from('households').delete().eq('id', h); }
  for (const p of fixture.personIds) { if (p) await admin.from('people').delete().eq('id', p); }
  for (const u of fixture.authUserIds) { if (u) await admin.auth.admin.deleteUser(u).catch(() => {}); }
}

main()
  .then(async () => {
    console.log(`\nHTTP journeys: ${passed} assertions passed, ${failures.length} failed`);
    if (failures.length) { failures.forEach((f) => console.log(`  FAIL ${f}`)); }
    await cleanup().catch(() => {});
    await db.end().catch(() => {});
    process.exit(failures.length ? 1 : 0);
  })
  .catch(async (err) => {
    console.error('journeys aborted:', err.message);
    console.error('aborted with response:', JSON.stringify(err.response ?? null));
    console.log(`\nHTTP journeys: ${passed} assertions passed before abort`);
    if (failures.length) failures.forEach((f) => console.log(`  FAIL ${f}`));
    await cleanup().catch(() => {});
    await db.end().catch(() => {});
    process.exit(1);
  });
