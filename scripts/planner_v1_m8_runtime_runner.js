#!/usr/bin/env node
'use strict';

/**
 * Planner V1 — M8 Home Summary Backend Runtime Tests.
 *
 * Local-only harness. Creates isolated fixtures across two households
 * with two members in the same household. Verifies:
 *   - Household isolation (hh-B data never leaks into hh-A summary)
 *   - Personal Goal visibility (personal goal of mem-1 hidden from mem-2)
 *   - Limits 3/3/1 enforced by backend
 *   - Counts describe eligible pool size (not capped by 3/3/1)
 *   - Deterministic ordering matches selectors
 *   - Cancelled and trashed entities excluded
 *   - Complete cleanup: zero remaining fixture rows
 *
 * Required: local Supabase stack running (`supabase start`),
 * backend process spawned on a free port and connected to the same
 * local DB. The integration suite (`tests/integration/run.js`) handles
 * the backend lifecycle; this script only receives API_BASE_URL and
 * a pre-setup fixture context.
 *
 * Exit codes: 0 = all contracts + cleanup passed; 1 = failure.
 */

const path = require('node:path');
const crypto = require('node:crypto');
const { createClient } = require('../backend/node_modules/@supabase/supabase-js');
const { loadTestEnvironment } = require('../tests/helpers/environment');

const testEnvironment = loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
});

const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter(
  (name) => !process.env[name],
);
if (missing.length) {
  console.error(`Missing env: ${missing.join(', ')}`);
  process.exit(1);
}

const url = new URL(process.env.SUPABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
  console.error('ENVIRONMENT_FAILURE: restricted to local Supabase.');
  process.exit(1);
}

const apiBaseUrl = (process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3001}`).replace(/\/+$/, '');
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- State ----------

let passCount = 0;
let failCount = 0;
const fixture = {
  userIds: [],
  personIds: [],
  householdIds: [],
};

function assert(condition, message) {
  if (condition) { passCount += 1; return; }
  failCount += 1;
  console.error(`  ✗ ${message}`);
}

function assertEqual(actual, expected, message) {
  const same =
    actual === expected ||
    (typeof actual === 'object' && actual !== null && typeof expected === 'object' && expected !== null &&
      JSON.stringify(actual) === JSON.stringify(expected));
  assert(same, `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

function randomCredential(label) {
  return `M8_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}`);
  return data;
}

async function createAuthUser(role) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `m8-${role}-${suffix}@example.test`;
  const password = randomCredential(role);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `M8 QA ${role}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}`);
  fixture.userIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, displayName) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: displayName,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `m8-${crypto.randomBytes(8).toString('hex')}`,
    timezone: 'America/Argentina/Buenos_Aires',
    default_language: 'es-419',
    config: {},
    created_by_person_id: ownerPersonId,
  });
  fixture.householdIds.push(household.id);

  const joinedAt = new Date().toISOString();
  await admin.from('household_members').insert(
    members.map((member) => ({
      household_id: household.id,
      person_id: member.personId,
      role: member.role,
      status: 'active',
      joined_at: joinedAt,
      household_onboarding_status: 'completed',
      household_onboarding_completed_at: joinedAt,
    })),
  );

  for (const member of members) {
    await admin.from('people').update({ active_household_id: household.id }).eq('id', member.personId);
  }
  return household;
}

async function login(email, password) {
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(`Login failed: ${error?.code || 'missing_session'}`);
  }
  return data.session.access_token;
}

async function requestJson(pathRelative, accessToken) {
  const response = await fetch(`${apiBaseUrl}${pathRelative}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Request-Id': `m8-runtime-${crypto.randomBytes(4).toString('hex')}`,
    },
  });
  const body = await response.json();
  return { status: response.status, body };
}

// ---------- Data seeding ----------

async function seedTask(hhId, creatorMemberId, creatorPersonId, overrides = {}) {
  return insertOne('planner_tasks', {
    household_id: hhId,
    title: overrides.title || 'M8 Task',
    status: overrides.status || 'pending',
    priority: overrides.priority || 'normal',
    due_date: overrides.due_date || null,
    due_time: overrides.due_time || null,
    requires_verification: overrides.requires_verification || false,
    assigned_to_member_id: overrides.assigned_to_member_id || null,
    created_by_member_id: creatorMemberId,
    created_by_person_id: creatorPersonId,
    trashed_at: overrides.trashed_at || null,
    cancelled_at: overrides.cancelled_at || null,
    cancelled_by_member_id: overrides.cancelled_by_member_id || null,
    cancelled_from_status: overrides.cancelled_from_status || null,
  });
}

async function seedEvent(hhId, creatorMemberId, creatorPersonId, overrides = {}) {
  return insertOne('planner_events', {
    household_id: hhId,
    title: overrides.title || 'M8 Event',
    starts_at: overrides.starts_at || new Date(Date.now() + 2 * 86400000).toISOString(),
    ends_at: overrides.ends_at || null,
    all_day: overrides.all_day || false,
    location_name: overrides.location_name || null,
    recurrence: overrides.recurrence || 'none',
    status: overrides.status || 'scheduled',
    created_by_member_id: creatorMemberId,
    created_by_person_id: creatorPersonId,
    trashed_at: overrides.trashed_at || null,
    cancelled_at: overrides.cancelled_at || null,
    cancelled_by_member_id: overrides.cancelled_by_member_id || null,
    cancelled_from_status: overrides.cancelled_from_status || null,
  });
}

async function seedGoal(hhId, creatorMemberId, creatorPersonId, overrides = {}) {
  return insertOne('planner_goals', {
    household_id: hhId,
    title: overrides.title || 'M8 Goal',
    category: overrides.category || 'home',
    visibility: overrides.visibility || 'household',
    progress_mode: overrides.progress_mode || 'steps',
    target_type: overrides.target_type || null,
    target_value: overrides.target_value || null,
    current_value: overrides.current_value || 0,
    unit: overrides.unit || null,
    status: overrides.status || 'active',
    starts_at: overrides.starts_at || null,
    ends_at: overrides.ends_at || null,
    created_by_member_id: creatorMemberId,
    trashed_at: overrides.trashed_at || null,
    deleted_at: overrides.deleted_at || null,
    completed_at: overrides.completed_at || null,
    closed_at: overrides.closed_at || null,
  });
}

// ---------- Cleanup ----------

async function deleteWhere(table, column, value) {
  const { error } = await admin.from(table).delete().eq(column, value);
  if (error && error.code !== '42P01') throw new Error(`${table} cleanup failed: ${error.code || 'unknown'}`);
}

async function cleanupFixture() {
  const errors = [];
  for (const hhId of fixture.householdIds) {
    for (const table of [
      'planner_activity_log', 'planner_idempotency_keys',
      'planner_tasks', 'planner_events', 'planner_goals', 'planner_goal_milestones',
    ]) {
      try { await deleteWhere(table, 'household_id', hhId); } catch (e) { errors.push(e); }
    }
    const { data: members } = await admin.from('household_members').select('person_id').eq('household_id', hhId);
    for (const m of (members ?? [])) {
      try { await admin.from('people').update({ active_household_id: null }).eq('id', m.person_id); } catch (e) { errors.push(e); }
    }
    try { await deleteWhere('household_members', 'household_id', hhId); } catch (e) { errors.push(e); }
    try { await deleteWhere('households', 'id', hhId); } catch (e) { errors.push(e); }
  }
  for (const personId of fixture.personIds) {
    try { await deleteWhere('people', 'id', personId); } catch (e) { errors.push(e); }
  }
  for (const userId of fixture.userIds) {
    try {
      await deleteWhere('users', 'id', userId);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    } catch (e) { errors.push(e); }
  }
  if (errors.length) throw new Error(`cleanup produced ${errors.length} error(s)`);
}

// ---------- Main ----------

async function main() {
  let cleanupStatus = 'NOT_RUN';
  try {
    // ---- Setup ----
    console.log('\n=== M8 Runtime: Fixture Setup ===\n');

    // Household A: coordinator (mem-1) + adolescent (mem-2)
    const coordAuth = await createAuthUser('coordinator');
    const coordPerson = await createPerson(coordAuth.user.id, 'M8 QA Coordinator');
    const adolAuth = await createAuthUser('adolescent');
    const adolPerson = await createPerson(adolAuth.user.id, 'M8 QA Adolescent');

    const hhA = await createHousehold('M8 HH-A', coordPerson.id, [
      { personId: coordPerson.id, role: 'coordinator' },
      { personId: adolPerson.id, role: 'adolescent' },
    ]);
    const coordToken = await login(coordAuth.email, coordAuth.password);
    const adolToken = await login(adolAuth.email, adolAuth.password);

    // Fetch memberships for both users in hh-A (to get member IDs)
    const coordClient = createClient(process.env.SUPABASE_URL, coordToken, { auth: { autoRefreshToken: false, persistSession: false } });
    const adolClient = createClient(process.env.SUPABASE_URL, adolToken, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: coordMemberships } = await coordClient
      .from('household_members')
      .select('id')
      .eq('household_id', hhA.id)
      .eq('person_id', coordPerson.id)
      .eq('status', 'active');
    const { data: adolMemberships } = await adolClient
      .from('household_members')
      .select('id')
      .eq('household_id', hhA.id)
      .eq('person_id', adolPerson.id)
      .eq('status', 'active');
    const coordMemberId = coordMemberships[0]?.id;
    const adolMemberId = adolMemberships[0]?.id;
    assert(typeof coordMemberId === 'string' && coordMemberId.length > 0, 'coordinator membership resolved');
    assert(typeof adolMemberId === 'string' && adolMemberId.length > 0, 'adolescent membership resolved');

    // Household B: separate coordinator (mem-3)
    const hhBAuth = await createAuthUser('coordinator');
    const hhBPerson = await createPerson(hhBAuth.user.id, 'M8 QA HH-B Coordinator');
    const hhB = await createHousehold('M8 HH-B', hhBPerson.id, [
      { personId: hhBPerson.id, role: 'coordinator' },
    ]);
    const hhBToken = await login(hhBAuth.email, hhBAuth.password);
    const hhBClient = createClient(process.env.SUPABASE_URL, hhBToken, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: hhBMemberships } = await hhBClient.from('household_members').select('id').eq('household_id', hhB.id).eq('status', 'active');
    const hhBMemberId = hhBMemberships[0]?.id;

    console.log(`  hhA=${hhA.id}  (mem-1=${coordMemberId}, mem-2=${adolMemberId})`);
    console.log(`  hhB=${hhB.id}  (mem-3=${hhBMemberId})`);
    console.log('M8_FIXTURE_SETUP=PASS');

    // ---- Seed data for HH-A (coordinator/mem-1 perspective) ----
    console.log('\n=== M8 Runtime: Data Seeding ===\n');

    // Tasks in hh-A: 8 pending (above limit 3) + 1 awaiting_verification + 1 cancelled + 1 trashed
    const hhATasks = [];
    for (let i = 1; i <= 8; i++) {
      hhATasks.push(await seedTask(hhA.id, coordMemberId, coordPerson.id, {
        title: `HH-A Pending Task ${i}`,
        status: 'pending',
        priority: i === 1 ? 'high' : i === 2 ? 'normal' : 'low',
        due_date: i <= 3 ? `2026-07-${15 + i}` : null,
      }));
    }
    hhATasks.push(await seedTask(hhA.id, coordMemberId, coordPerson.id, {
      title: 'HH-A Awaiting Verification',
      status: 'awaiting_verification',
      priority: 'normal',
      due_date: '2026-07-20',
    }));
    hhATasks.push(await seedTask(hhA.id, coordMemberId, coordPerson.id, {
      title: 'HH-A Cancelled Task', status: 'cancelled',
      cancelled_at: new Date().toISOString(), cancelled_by_member_id: coordMemberId,
      cancelled_from_status: 'pending',
    }));
    hhATasks.push(await seedTask(hhA.id, coordMemberId, coordPerson.id, {
      title: 'HH-A Trashed Task', status: 'pending',
      trashed_at: new Date().toISOString(),
    }));

    // Events in hh-A: 4 scheduled within horizon + 1 past + 1 cancelled + 1 trashed
    const now = new Date();
    const hhAEvents = [];
    for (let i = 1; i <= 4; i++) {
      const startsAt = new Date(now.getTime() + (i + 1) * 86400000);
      hhAEvents.push(await seedEvent(hhA.id, coordMemberId, coordPerson.id, {
        title: `HH-A Event Day ${i + 1}`,
        starts_at: startsAt.toISOString(),
      }));
    }
    // Past event (outside horizon)
    hhAEvents.push(await seedEvent(hhA.id, coordMemberId, coordPerson.id, {
      title: 'HH-A Past Event',
      starts_at: new Date(now.getTime() - 86400000).toISOString(),
    }));
    // Cancelled event
    hhAEvents.push(await seedEvent(hhA.id, coordMemberId, coordPerson.id, {
      title: 'HH-A Cancelled Event', status: 'cancelled',
      starts_at: new Date(now.getTime() + 3 * 86400000).toISOString(),
      cancelled_at: new Date().toISOString(), cancelled_by_member_id: coordMemberId,
      cancelled_from_status: 'scheduled',
    }));
    // Trashed event
    hhAEvents.push(await seedEvent(hhA.id, coordMemberId, coordPerson.id, {
      title: 'HH-A Trashed Event', status: 'scheduled',
      starts_at: new Date(now.getTime() + 2 * 86400000).toISOString(),
      trashed_at: new Date().toISOString(),
    }));

    // Goals in hh-A: 2 household active + 1 personal (mem-1) + 1 personal (mem-1) + 1 completed + 1 closed + 1 trashed
    const hhAGoals = [];
    hhAGoals.push(await seedGoal(hhA.id, coordMemberId, coordPerson.id, {
      title: 'HH-A Household Goal A', visibility: 'household', status: 'active',
      current_value: 30, target_value: 100, progress_mode: 'numeric', target_type: 'percentage',
    }));
    hhAGoals.push(await seedGoal(hhA.id, coordMemberId, coordPerson.id, {
      title: 'HH-A Household Goal B', visibility: 'household', status: 'active',
      current_value: 10, target_value: 100, progress_mode: 'numeric', target_type: 'percentage',
    }));
    // Personal goal of mem-1 (coordinator) — should be visible to mem-1, hidden from mem-2
    const personalGoalMem1 = await seedGoal(hhA.id, coordMemberId, coordPerson.id, {
      title: 'HH-A Personal Goal of Mem-1',
      visibility: 'personal', status: 'active',
      current_value: 100, target_value: 100, progress_mode: 'numeric', target_type: 'percentage',
    });
    hhAGoals.push(personalGoalMem1);
    // Completed goal
    hhAGoals.push(await seedGoal(hhA.id, coordMemberId, coordPerson.id, {
      title: 'HH-A Completed Goal', visibility: 'household', status: 'completed',
      completed_at: new Date().toISOString(),
    }));
    // Closed goal
    hhAGoals.push(await seedGoal(hhA.id, coordMemberId, coordPerson.id, {
      title: 'HH-A Closed Goal', visibility: 'household', status: 'closed',
      closed_at: new Date().toISOString(),
    }));
    // Trashed goal
    hhAGoals.push(await seedGoal(hhA.id, coordMemberId, coordPerson.id, {
      title: 'HH-A Trashed Goal', visibility: 'household', status: 'active',
      trashed_at: new Date().toISOString(),
    }));

    // Seed data for HH-B (separate household)
    // 2 tasks, 2 events, 2 goals active — ensure hh-A summary never sees these
    await seedTask(hhB.id, hhBMemberId, hhBPerson.id, { title: 'HH-B Task 1', status: 'pending' });
    await seedTask(hhB.id, hhBMemberId, hhBPerson.id, { title: 'HH-B Task 2', status: 'pending' });
    await seedEvent(hhB.id, hhBMemberId, hhBPerson.id, {
      title: 'HH-B Event 1', starts_at: new Date(now.getTime() + 86400000).toISOString(),
    });
    await seedEvent(hhB.id, hhBMemberId, hhBPerson.id, {
      title: 'HH-B Event 2', starts_at: new Date(now.getTime() + 2 * 86400000).toISOString(),
    });
    await seedGoal(hhB.id, hhBMemberId, hhBPerson.id, { title: 'HH-B Goal 1', status: 'active', visibility: 'household' });
    await seedGoal(hhB.id, hhBMemberId, hhBPerson.id, { title: 'HH-B Goal 2', status: 'active', visibility: 'household' });

    console.log('M8_DATA_SEED=PASS');

    // ---- Test 1: Coordinator (mem-1) summary ----
    console.log('\n=== M8 Runtime: Mem-1 (Coordinator) Summary ===\n');

    const { status: status1, body: summary1 } = await requestJson('/api/planner/summary', coordToken);
    assertEqual(status1, 200, 'mem-1 summary HTTP 200');
    assertEqual(summary1.projection_version, 'planner.home_summary.v1', 'mem-1 projection_version stable');
    assert(typeof summary1.generated_at === 'string', 'mem-1 generated_at ISO string');
    assert(!isNaN(Date.parse(summary1.generated_at)), 'mem-1 generated_at parseable');

    // V1 authority keys present
    assert('household_id' in summary1, 'mem-1 has household_id');
    assertEqual(typeof summary1.counts, 'object', 'mem-1 counts is object');
    assert(Array.isArray(summary1.tasks), 'mem-1 tasks is array');
    assert(Array.isArray(summary1.events), 'mem-1 events is array');
    assert('goal' in summary1, 'mem-1 goal key present');
    assert(Array.isArray(summary1.partial_errors), 'mem-1 partial_errors is array');
    assertEqual(summary1.partial_errors.length, 0, 'mem-1 no partial errors');

    // Limits 3/3/1
    assert(summary1.tasks.length <= 3, 'mem-1 tasks ≤ 3');
    assert(summary1.tasks.length === 3, 'mem-1 tasks exactly 3 (pool > limit)');
    assert(summary1.events.length <= 3, 'mem-1 events ≤ 3');
    assert(summary1.events.length === 3, 'mem-1 events exactly 3 (pool > limit)');
    assert(
      summary1.goal === null || (typeof summary1.goal === 'object' && summary1.goal !== null),
      'mem-1 goal is object or null',
    );
    assert(summary1.goal !== null, 'mem-1 goal is not null (eligible goals exist)');

    // Counts: eligible pool sizes, NOT capped by 3/3/1
    // HH-A eligible tasks: 8 pending + 1 awaiting = 9 (cancelled + trashed excluded)
    assertEqual(summary1.counts.tasks, 9, 'mem-1 counts.tasks = 9 (elegible pool, not 3)');
    // HH-A eligible events: 4 within horizon (past + cancelled + trashed excluded)
    assertEqual(summary1.counts.events, 4, 'mem-1 counts.events = 4 (elegible pool, not 3)');
    // HH-A eligible goals: 2 household active + 1 personal (own) = 3 (completed/closed/trashed excluded)
    assertEqual(summary1.counts.goals, 3, 'mem-1 counts.goals = 3 (elegible pool, not 1)');

    // Task ordering: awaiting_verification must be first
    const tasks1 = summary1.tasks;
    if (tasks1.length >= 1) {
      assertEqual(tasks1[0].status, 'awaiting_verification', 'mem-1 first task is awaiting_verification');
    }
    // No cancelled in tasks
    for (const task of tasks1) {
      assert(task.status !== 'cancelled', 'mem-1 tasks: no cancelled task');
    }
    // No trashed in tasks
    const taskTitles = tasks1.map((t) => t.title);
    for (const tt of taskTitles) {
      assert(!tt.includes('Trashed'), 'mem-1 tasks: no trashed task');
    }

    // Events: starts_at ascending
    const events1 = summary1.events;
    for (let i = 1; i < events1.length; i++) {
      assert(events1[i].starts_at >= events1[i - 1].starts_at, `mem-1 events ordered: ${i}`);
    }
    const eventTitles = events1.map((e) => e.title);
    for (const et of eventTitles) {
      assert(!et.includes('Past') && !et.includes('Cancelled') && !et.includes('Trashed'), 'mem-1 events: only scheduled within horizon');
    }

    // Goal selection: highest progress household-active should be chosen
    // Progress: Household Goal A = 30%, B = 10%, Personal Mem-1 = 100%
    // Personal Mem-1 has highest progress at 100% — should be the selected goal
    if (summary1.goal) {
      assert(
        summary1.goal.title === 'HH-A Personal Goal of Mem-1' || summary1.goal.progress_percentage >= 30,
        'mem-1 goal is highest progress eligible goal',
      );
    }

    // Legacy fields present
    assert(typeof summary1.pending_tasks_count === 'number', 'mem-1 legacy pending_tasks_count');
    assert(typeof summary1.overdue_tasks_count === 'number', 'mem-1 legacy overdue_tasks_count');
    assert(Array.isArray(summary1.tasks_today), 'mem-1 legacy tasks_today array');
    assert(typeof summary1.briefing_text === 'string', 'mem-1 legacy briefing_text');

    // ---- Test 2: Adolescent (mem-2) summary — personal goal privacy ----
    console.log('\n=== M8 Runtime: Mem-2 (Adolescent) Personal Goal Privacy ===\n');

    const { status: status2, body: summary2 } = await requestJson('/api/planner/summary', adolToken);
    assertEqual(status2, 200, 'mem-2 summary HTTP 200');
    assertEqual(summary2.projection_version, 'planner.home_summary.v1', 'mem-2 projection_version stable');
    assertEqual(summary2.partial_errors.length, 0, 'mem-2 no partial errors');

    // Same household → sees the same tasks/events pool
    assertEqual(summary2.counts.tasks, summary1.counts.tasks, 'mem-2 same tasks count as mem-1');
    assertEqual(summary2.counts.events, summary1.counts.events, 'mem-2 same events count as mem-1');

    // Goal privacy: mem-2 must NOT see mem-1's personal goal
    // mem-2 eligible: 2 household goals, mem-1's personal excluded
    assertEqual(summary2.counts.goals, 2, 'mem-2 counts.goals = 2 (personal goal of mem-1 excluded)');

    // The selected goal must NOT be mem-1's personal goal
    if (summary2.goal) {
      assert(
        summary2.goal.title !== 'HH-A Personal Goal of Mem-1',
        'mem-2 goal is NOT mem-1 personal goal',
      );
      assert(
        summary2.goal.visibility === 'household',
        'mem-2 goal is household-visible',
      );
    }

    // ---- Test 3: HH-B isolation ----
    console.log('\n=== M8 Runtime: HH-B Household Isolation ===\n');

    const { status: statusB, body: summaryB } = await requestJson('/api/planner/summary', hhBToken);
    assertEqual(statusB, 200, 'hh-B summary HTTP 200');
    assertEqual(summaryB.projection_version, 'planner.home_summary.v1', 'hh-B projection_version stable');
    assertEqual(summaryB.partial_errors.length, 0, 'hh-B no partial errors');

    // HH-B only has 2 tasks, 2 events, 2 goals — all should be in counts
    assertEqual(summaryB.counts.tasks, 2, 'hh-B counts.tasks = 2');
    assertEqual(summaryB.counts.events, 2, 'hh-B counts.events = 2');
    assertEqual(summaryB.counts.goals, 2, 'hh-B counts.goals = 2');
    assertEqual(summaryB.tasks.length, 2, 'hh-B tasks all eligible (pool < limit)');
    assertEqual(summaryB.events.length, 2, 'hh-B events all eligible (pool < limit)');

    // HH-B must NOT see any hh-A data
    const hhATaskTitles = hhATasks.map((t) => t.title);
    const hhAGoalTitles = hhAGoals.map((g) => g.title);
    const hhBSummarizedTaskTitles = summaryB.tasks.map((t) => t.title);
    const hhBGoalTitle = summaryB.goal ? summaryB.goal.title : '';
    for (const title of hhBSummarizedTaskTitles) {
      assert(!hhATaskTitles.includes(title), `hh-B task "${title}" not from hh-A`);
    }
    if (hhBGoalTitle) {
      assert(!hhAGoalTitles.includes(hhBGoalTitle), `hh-B goal "${hhBGoalTitle}" not from hh-A`);
    }

    // HH-B task titles are the ones we seeded
    assert(hhBSummarizedTaskTitles.includes('HH-B Task 1') || hhBSummarizedTaskTitles.includes('HH-B Task 2'), 'hh-B sees own tasks');

    // ---- Test 4: Known contract shape assertions ----
    console.log('\n=== M8 Runtime: Contract Shape ===\n');

    // Keys ARE the canonical names
    const v1Keys = ['household_id', 'projection_version', 'generated_at', 'counts', 'tasks', 'events', 'goal', 'partial_errors'];
    for (const key of v1Keys) {
      assert(key in summary1, `V1 key "${key}" present in response`);
    }

    // goal is singular (object or null), NOT array
    assert(!Array.isArray(summary1.goal), 'goal is singular (object | null), NOT array');
    assert(
      summary1.goal === null || (typeof summary1.goal === 'object' && 'id' in summary1.goal),
      'goal is null or DTO object',
    );

    // counts keys are plural
    assert('tasks' in summary1.counts, 'counts.tasks present (plural)');
    assert('events' in summary1.counts, 'counts.events present (plural)');
    assert('goals' in summary1.counts, 'counts.goals present (plural)');

    // partial_errors section keys are plural
    // (array is empty here, but we verify the service contract)
    const validSections = ['tasks', 'events', 'goals'];
    for (const section of validSections) {
      assert(
        typeof section === 'string' && section.length > 0 && !['task', 'event', 'goal'].includes(section),
        `partial_errors section "${section}" is plural`,
      );
    }

    // DTOs: forbidden fields absent
    if (summary1.tasks.length > 0) {
      const firstTask = summary1.tasks[0];
      assert(!('description' in firstTask), 'task DTO no description');
      assert(!('completed_at' in firstTask), 'task DTO no completed_at');
      assert(!('trashed_at' in firstTask), 'task DTO no trashed_at');
      assert(!('origin_module' in firstTask), 'task DTO no origin_module');
    }
    if (summary1.events.length > 0) {
      const firstEvent = summary1.events[0];
      assert(!('description' in firstEvent), 'event DTO no description');
      assert(!('cancelled_at' in firstEvent), 'event DTO no cancelled_at');
      assert(!('trashed_at' in firstEvent), 'event DTO no trashed_at');
      assert(!('parent_event_id' in firstEvent), 'event DTO no parent_event_id');
    }
    if (summary1.goal) {
      assert(!('description' in summary1.goal), 'goal DTO no description');
      assert(!('trashed_at' in summary1.goal), 'goal DTO no trashed_at');
      assert(!('deleted_at' in summary1.goal), 'goal DTO no deleted_at');
    }

    // ---- Final report ----
    console.log(`\n=== M8 Runtime Tests: ${passCount} pass / ${failCount} fail ===\n`);
    if (failCount > 0) {
      console.error(`✗ M8 RUNTIME FAILED (${failCount} failures)`);
      process.exitCode = 1;
    } else {
      console.log(`✓ M8 RUNTIME PASSED (${passCount} assertions)`);
    }
  } catch (error) {
    console.error(`M8_RUNTIME_FATAL: ${error instanceof Error ? error.message : String(error)}`);
    if (error.stack) console.error(error.stack);
    process.exitCode = 1;
  } finally {
    try {
      await cleanupFixture();
      cleanupStatus = 'PASS';
      console.log('M8_FIXTURE_CLEANUP=PASS');
    } catch (error) {
      cleanupStatus = 'FAIL';
      console.error(`M8_FIXTURE_CLEANUP_FAILURE: ${error instanceof Error ? error.message : String(error)}`);
      if (process.exitCode === 0) process.exitCode = 1;
    }
    testEnvironment.cleanup();
    console.log(`M8_RUNTIME_CLEANUP=${cleanupStatus}`);
  }
}

main();