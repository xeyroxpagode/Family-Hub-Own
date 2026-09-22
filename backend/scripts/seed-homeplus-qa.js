'use strict';

/**
 * HomePlus Finance manual QA seed.
 *
 * Local-only by design:
 * - SUPABASE_URL must point to 127.0.0.1/localhost, normally http://127.0.0.1:56221.
 * - DB cleanup uses LOCAL_SUPABASE_DB_URL/SUPABASE_DB_URL only when it is local, or the
 *   default local Supabase Postgres URL at 127.0.0.1:56222.
 * - Cleanup is scoped to the QA household slug and the deterministic QA auth users below.
 */

const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { Client: PgClient } = require('pg');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const {
  createFinanceAccount,
  archiveFinanceAccount,
} = require('../src/services/finance.account.service');
const { correctAccountBalance } = require('../src/services/finance.balance.correction.service');
const { createExpense, createIncome } = require('../src/services/finance.transaction.service');
const { correctTransaction } = require('../src/services/finance.transaction.correction.service');
const { trashFinanceTransaction } = require('../src/services/finance.transaction.trash.service');
const { createTransfer } = require('../src/services/finance.transfer.service');
const { createRefund, correctRefund } = require('../src/services/finance.refund.service');
const {
  createOneOffPaymentDue,
  createPaymentSeries,
  cancelPaymentDue,
  cancelPaymentSeries,
  editPaymentDue,
  settleCreditCardPaymentDue,
  registerPayment,
} = require('../src/services/finance.payment.service');
const {
  createPool,
  renamePool,
  archivePool,
  allocatePool,
  releasePool,
  transferPool,
  assignExpenseToPool,
  unassignExpensePool,
  distributeIncomeToPools,
} = require('../src/services/finance.pool.service');
const { upsertCategoryPoolDefault } = require('../src/services/finance.category-pool-default.service');
const {
  createSpendingLimit,
  editSpendingLimit,
  cancelSpendingLimit,
} = require('../src/services/finance.spending-limit.service');
const {
  listFinanceMovements,
  summarizeFinance,
} = require('../src/services/finance.read.service');
const {
  buildPayloadEnvelope,
  structuralFingerprint,
} = require('../src/contracts/planner.presets-drafts.contract');

const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL);
const SUPABASE_ANON_KEY = cleanEnv(process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_KEY);
const SUPABASE_SERVICE_ROLE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const LOCAL_DB_URL = cleanEnv(process.env.LOCAL_SUPABASE_DB_URL ?? process.env.SUPABASE_DB_URL)
  ?? 'postgresql://postgres:postgres@127.0.0.1:56222/postgres';

const QA_PASSWORD = 'HomePlusQA2026!';
const HOUSEHOLD_SLUG = 'familia-qa-garcia';
const HOUSEHOLD_NAME = 'Familia QA García';
const TIMEZONE = 'America/Argentina/Buenos_Aires';
const SEED_MARKER = 'homeplus-finance-manual-qa-v1';

const QA_USERS = [
  {
    key: 'sofia',
    email: 'qa.sofia.homeplus@example.test',
    displayName: 'Sofía QA García',
    firstName: 'Sofía',
    lastName: 'García',
    role: 'coordinator',
  },
  {
    key: 'martin',
    email: 'qa.martin.homeplus@example.test',
    displayName: 'Martín QA García',
    firstName: 'Martín',
    lastName: 'García',
    role: 'adult',
  },
  {
    key: 'luna',
    email: 'qa.luna.homeplus@example.test',
    displayName: 'Luna QA García',
    firstName: 'Luna',
    lastName: 'García',
    role: 'adolescent',
  },
  {
    key: 'tomi',
    email: 'qa.tomi.homeplus@example.test',
    displayName: 'Tomi QA García',
    firstName: 'Tomi',
    lastName: 'García',
    role: 'child',
  },
];

const nativeCategoryKeys = [
  'food',
  'housing',
  'utilities',
  'transport',
  'health',
  'education',
  'shopping',
  'leisure',
  'subscriptions',
  'taxes',
  'financial_costs',
  'salary',
  'independent_work',
  'sales',
  'returns',
];

let mutationSeq = 0;

function cleanEnv(value) {
  return typeof value === 'string' && value.trim()
    ? value.trim().replace(/^['"]+|['"]+$/g, '')
    : null;
}

function usageAndExit(message) {
  if (message) {
    console.error(`\n${message}`);
  }
  console.error('\nRequired env in backend/.env:');
  console.error('  SUPABASE_URL=http://127.0.0.1:56221');
  console.error('  SUPABASE_ANON_KEY=...');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

function assertLocalUrl(rawUrl, label, expectedPort) {
  if (!rawUrl) usageAndExit(`${label} is missing.`);
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    usageAndExit(`${label} is not a valid URL.`);
  }
  const host = parsed.hostname.toLowerCase();
  const isLocal = host === '127.0.0.1' || host === 'localhost';
  if (!isLocal) {
    throw new Error(`${label} must be local. Refusing to run against ${rawUrl}.`);
  }
  if (expectedPort && parsed.port && parsed.port !== expectedPort) {
    throw new Error(`${label} must use the local HomePlus port ${expectedPort}. Got ${parsed.port}.`);
  }
}

function assertLocalDbUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  const host = parsed.hostname.toLowerCase();
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(`DB URL must be local. Refusing to run against ${rawUrl}.`);
  }
  if (parsed.port && parsed.port !== '56222') {
    throw new Error(`DB URL must use local HomePlus Postgres port 56222. Got ${parsed.port}.`);
  }
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(base, days) {
  const next = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateDays(days) {
  return isoDate(addDays(todayUtc(), days));
}

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function currentMonthKey() {
  return isoDate(todayUtc()).slice(0, 7);
}

function nextMonthKey() {
  const now = todayUtc();
  return isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))).slice(0, 7);
}

function currentYearKey() {
  return isoDate(todayUtc()).slice(0, 4);
}

function mutation(label) {
  mutationSeq += 1;
  const suffix = crypto.randomUUID();
  const safe = String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 34);
  const id = `qa-${mutationSeq}-${safe}-${suffix}`;
  return { mutationId: id.slice(0, 128), idempotencyKey: id.slice(0, 128) };
}

function withPaymentMutation(operation, payload) {
  const correlation = mutation(operation);
  const payloadHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ operation, payload }))
    .digest('hex');
  return { ...payload, ...correlation, payloadHash };
}

function makeContext(session, person, household = null, membership = null) {
  return {
    client: session.client,
    accountId: session.authUser.id,
    contextType: household ? 'household' : 'personal',
    personId: person.id,
    person,
    householdId: household?.id ?? null,
    household: household ?? null,
    membershipId: membership?.id ?? null,
    membership: membership ?? null,
  };
}

function spendingLimitIdFromResult(result) {
  const row = result?.response_body?.spendingLimit
    ?? result?.response_body?.limit
    ?? result?.spendingLimit
    ?? result?.limit
    ?? result?.series
    ?? result;
  if (!row?.id) {
    throw new Error(`Unexpected spending limit response: ${JSON.stringify(result)}`);
  }
  return row.id;
}

async function findAuthUserByEmail(admin, email) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Cannot list auth users: ${error.message}`);
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (!data.users.length || data.users.length < 1000) return null;
    page += 1;
  }
}

async function ensureAuthUsers(admin) {
  const users = {};
  for (const spec of QA_USERS) {
    const existing = await findAuthUserByEmail(admin, spec.email);
    if (existing) {
      const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
        password: QA_PASSWORD,
        email_confirm: true,
        user_metadata: {
          display_name: spec.displayName,
          qa_seed: SEED_MARKER,
        },
      });
      if (error) throw new Error(`Cannot update auth user ${spec.email}: ${error.message}`);
      users[spec.key] = data.user;
      continue;
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: QA_PASSWORD,
      email_confirm: true,
      user_metadata: {
        display_name: spec.displayName,
        qa_seed: SEED_MARKER,
      },
    });
    if (error) throw new Error(`Cannot create auth user ${spec.email}: ${error.message}`);
    users[spec.key] = data.user;
  }
  return users;
}

async function ensurePeople(admin, authUsers) {
  const people = {};
  for (const spec of QA_USERS) {
    const authUser = authUsers[spec.key];
    const { data: existing, error: lookupError } = await admin
      .from('people')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();
    if (lookupError) throw new Error(`Cannot read person for ${spec.email}: ${lookupError.message}`);

    const payload = {
      auth_user_id: authUser.id,
      display_name: spec.displayName,
      first_name: spec.firstName,
      last_name: spec.lastName,
      default_language: 'es-419',
      personal_settings: {
        qaSeed: SEED_MARKER,
        testUser: true,
      },
      app_onboarding_status: 'completed',
      app_onboarding_completed_at: new Date().toISOString(),
    };

    if (existing) {
      const { data, error } = await admin
        .from('people')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw new Error(`Cannot update person ${spec.displayName}: ${error.message}`);
      people[spec.key] = data;
    } else {
      const { data, error } = await admin
        .from('people')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw new Error(`Cannot create person ${spec.displayName}: ${error.message}`);
      people[spec.key] = data;
    }
  }
  return people;
}

async function cleanupQaData(authUsers) {
  assertLocalDbUrl(LOCAL_DB_URL);
  const pg = new PgClient({ connectionString: LOCAL_DB_URL });
  await pg.connect();
  try {
    await pg.query('begin');
    const authIds = QA_USERS.map((spec) => authUsers[spec.key]?.id).filter(Boolean);
    const householdResult = await pg.query('select id from public.households where slug = $1 limit 1', [HOUSEHOLD_SLUG]);
    const householdId = householdResult.rows[0]?.id ?? null;
    const peopleResult = authIds.length
      ? await pg.query('select id from public.people where auth_user_id = any($1::uuid[])', [authIds])
      : { rows: [] };
    const personIds = peopleResult.rows.map((row) => row.id);

    if (!householdId && personIds.length === 0) {
      await pg.query('commit');
      return;
    }

    if (householdId) {
      await pg.query('update public.people set active_household_id = null where active_household_id = $1', [householdId]);
    }
    if (personIds.length) {
      await pg.query('update public.people set active_household_id = null where id = any($1::uuid[])', [personIds]);
    }

    const params = [householdId, personIds];
    await deleteIfExists(pg, 'planner_idempotency_keys', `
      delete from public.planner_idempotency_keys
      where ($1::uuid is not null and (household_id = $1 or scope_id = $1))
         or (coalesce(array_length($2::uuid[], 1), 0) > 0 and (actor_person_id = any($2::uuid[]) or scope_id = any($2::uuid[])))
    `, params);

    await deleteIfExists(pg, 'finance_category_pool_defaults', scopedDelete('finance_category_pool_defaults'), params);
    await deleteIfExists(pg, 'finance_expense_pool_links', scopedDelete('finance_expense_pool_links'), params);
    await deleteIfExists(pg, 'finance_pool_entries', `
      delete from public.finance_pool_entries fpe
      using public.finance_pool_operations fpo
      where fpe.operation_id = fpo.id
        and (($1::uuid is not null and fpo.household_id = $1)
          or (coalesce(array_length($2::uuid[], 1), 0) > 0 and fpo.owner_person_id = any($2::uuid[])))
    `, params);
    await deleteIfExists(pg, 'finance_pool_operations', scopedDelete('finance_pool_operations'), params);
    await deleteIfExists(pg, 'finance_pools', scopedDelete('finance_pools'), params);

    await deleteIfExists(pg, 'finance_spending_limit_exceptions', `
      delete from public.finance_spending_limit_exceptions fsle
      using public.finance_spending_limit_series fsls
      where fsle.series_id = fsls.id
        and (($1::uuid is not null and fsls.household_id = $1)
          or (coalesce(array_length($2::uuid[], 1), 0) > 0 and fsls.owner_person_id = any($2::uuid[])))
    `, params);
    await deleteIfExists(pg, 'finance_spending_limit_versions', `
      delete from public.finance_spending_limit_versions fslv
      using public.finance_spending_limit_series fsls
      where fslv.series_id = fsls.id
        and (($1::uuid is not null and fsls.household_id = $1)
          or (coalesce(array_length($2::uuid[], 1), 0) > 0 and fsls.owner_person_id = any($2::uuid[])))
    `, params);
    await deleteIfExists(pg, 'finance_spending_limit_series', scopedDelete('finance_spending_limit_series'), params);

    await deleteIfExists(pg, 'finance_payment_due_settlements', `
      delete from public.finance_payment_due_settlements fpds
      using public.finance_payment_dues fpd
      where fpds.payment_due_id = fpd.id
        and (($1::uuid is not null and fpd.household_id = $1)
          or (coalesce(array_length($2::uuid[], 1), 0) > 0 and fpd.owner_person_id = any($2::uuid[])))
    `, params);
    await deleteIfExists(pg, 'finance_payment_dues', scopedDelete('finance_payment_dues'), params);
    await deleteIfExists(pg, 'finance_payment_series', scopedDelete('finance_payment_series'), params);

    await deleteIfExists(pg, 'finance_account_effects', scopedDelete('finance_account_effects'), params);
    await deleteIfExists(pg, 'finance_refund_events', `
      delete from public.finance_refund_events fre
      using public.finance_transactions ft
      where fre.expense_root_transaction_id = ft.root_transaction_id
        and fre.corrected_from_refund_event_id is not null
        and (($1::uuid is not null and ft.household_id = $1)
          or (coalesce(array_length($2::uuid[], 1), 0) > 0 and ft.owner_person_id = any($2::uuid[])))
    `, params);
    await deleteIfExists(pg, 'finance_refund_events', `
      delete from public.finance_refund_events fre
      using public.finance_transactions ft
      where fre.expense_root_transaction_id = ft.root_transaction_id
        and (($1::uuid is not null and ft.household_id = $1)
          or (coalesce(array_length($2::uuid[], 1), 0) > 0 and ft.owner_person_id = any($2::uuid[])))
    `, params);

    await deleteIfExists(pg, 'finance_transfers', `
      delete from public.finance_transfers ft
      where coalesce(array_length($1::uuid[], 1), 0) > 0
        and ft.created_by_person_id = any($1::uuid[])
    `, [personIds]);
    await deleteIfExists(pg, 'finance_account_balance_anchors', `
      delete from public.finance_account_balance_anchors faca
      using public.finance_accounts fa
      where faca.account_id = fa.id
        and (($1::uuid is not null and fa.household_id = $1)
          or (coalesce(array_length($2::uuid[], 1), 0) > 0 and fa.owner_person_id = any($2::uuid[])))
    `, params);
    await deleteIfExists(pg, 'finance_transactions', `
      delete from public.finance_transactions
      where corrected_from_transaction_id is not null
        and (($1::uuid is not null and household_id = $1)
          or (coalesce(array_length($2::uuid[], 1), 0) > 0 and owner_person_id = any($2::uuid[])))
    `, params);
    await deleteIfExists(pg, 'finance_transactions', scopedDelete('finance_transactions'), params);
    await deleteIfExists(pg, 'finance_accounts', scopedDelete('finance_accounts'), params);
    await deleteIfExists(pg, 'finance_categories', `
      delete from public.finance_categories
      where category_kind <> 'native'
        and (($1::uuid is not null and household_id = $1)
          or (coalesce(array_length($2::uuid[], 1), 0) > 0 and owner_person_id = any($2::uuid[])))
    `, params);

    if (householdId) {
      await deleteIfExists(pg, 'inventory_restock_requests', 'delete from public.inventory_restock_requests where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'inventory_item_movements', 'delete from public.inventory_item_movements where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'inventory_items', 'delete from public.inventory_items where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'presence_member_locations', 'delete from public.presence_member_locations where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'planner_responsibility_occurrences', 'delete from public.planner_responsibility_occurrences where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'planner_tasks', 'delete from public.planner_tasks where household_id = $1', [householdId]);
      // P2.2A: household-scoped presets are recreated on each rerun (their
      // revisions cascade). HomePlus system presets are NOT touched.
      await deleteIfExists(pg, 'planner_presets', 'delete from public.planner_presets where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'planner_responsibility_members', 'delete from public.planner_responsibility_members where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'planner_responsibilities', 'delete from public.planner_responsibilities where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'planner_events', 'delete from public.planner_events where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'household_schedule_blocks', 'delete from public.household_schedule_blocks where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'household_schedule_preferences', 'delete from public.household_schedule_preferences where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'planner_goal_milestones', `
        delete from public.planner_goal_milestones where goal_id in (select id from public.planner_goals where household_id = $1)
      `, [householdId]);
      await deleteIfExists(pg, 'planner_goals', 'delete from public.planner_goals where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'planner_plan_requirements', `
        delete from public.planner_plan_requirements where plan_id in (select id from public.planner_plans where household_id = $1)
      `, [householdId]);
      await deleteIfExists(pg, 'planner_plan_measurement_history', `
        delete from public.planner_plan_measurement_history where plan_id in (select id from public.planner_plans where household_id = $1)
      `, [householdId]);
      await deleteIfExists(pg, 'planner_plan_manual_conditions', `
        delete from public.planner_plan_manual_conditions where plan_id in (select id from public.planner_plans where household_id = $1)
      `, [householdId]);
      await deleteIfExists(pg, 'planner_plan_measurements', `
        delete from public.planner_plan_measurements where plan_id in (select id from public.planner_plans where household_id = $1)
      `, [householdId]);
      await deleteIfExists(pg, 'planner_plan_milestones', `
        delete from public.planner_plan_milestones where plan_id in (select id from public.planner_plans where household_id = $1)
      `, [householdId]);
      await deleteIfExists(pg, 'planner_plan_legacy_goal_links', `
        delete from public.planner_plan_legacy_goal_links where plan_id in (select id from public.planner_plans where household_id = $1)
      `, [householdId]);
      await deleteIfExists(pg, 'planner_plans', 'delete from public.planner_plans where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'household_invite_links', 'delete from public.household_invite_links where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'household_role_change_requests', 'delete from public.household_role_change_requests where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'household_members', 'delete from public.household_members where household_id = $1', [householdId]);
      await pg.query('delete from public.households where id = $1', [householdId]);
    }

    await pg.query('commit');
  } catch (error) {
    await pg.query('rollback');
    throw error;
  } finally {
    await pg.end();
  }
}

function scopedDelete(table) {
  return `
    delete from public.${table}
    where ($1::uuid is not null and household_id = $1)
       or (coalesce(array_length($2::uuid[], 1), 0) > 0 and owner_person_id = any($2::uuid[]))
  `;
}

async function deleteIfExists(pg, tableName, sql, params) {
  const { rows } = await pg.query('select to_regclass($1::text) as regclass', [`public.${tableName}`]);
  if (!rows[0]?.regclass) return;
  await pg.query(sql, params);
}

async function createHousehold(admin, people) {
  const { data: household, error } = await admin
    .from('households')
    .insert({
      name: HOUSEHOLD_NAME,
      slug: HOUSEHOLD_SLUG,
      timezone: TIMEZONE,
      default_language: 'es-419',
      config: {
        qaSeed: SEED_MARKER,
        realisticLocalSeed: true,
      },
      created_by_person_id: people.sofia.id,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Cannot create QA household: ${error.message}`);

  const members = {};
  for (const spec of QA_USERS) {
    const { data, error: memberError } = await admin
      .from('household_members')
      .insert({
        household_id: household.id,
        person_id: people[spec.key].id,
        role: spec.role,
        status: 'active',
        joined_at: new Date().toISOString(),
        household_onboarding_status: 'completed',
        household_onboarding_completed_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (memberError) throw new Error(`Cannot create membership for ${spec.displayName}: ${memberError.message}`);
    members[spec.key] = data;

    const { error: updateError } = await admin
      .from('people')
      .update({ active_household_id: household.id })
      .eq('id', people[spec.key].id);
    if (updateError) throw new Error(`Cannot set active household for ${spec.displayName}: ${updateError.message}`);
  }

  return { household, members };
}

async function findHouseholdBySlug(admin, slug) {
  const { data, error } = await admin
    .from('households')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`Cannot find household ${slug}: ${error.message}`);
  return data;
}

async function ensureMembershipsForHousehold(admin, people, household) {
  const members = {};
  for (const spec of QA_USERS) {
    const person = people[spec.key];
    const { data: existing, error: lookupError } = await admin
      .from('household_members')
      .select('*')
      .eq('household_id', household.id)
      .eq('person_id', person.id)
      .maybeSingle();
    if (lookupError) throw new Error(`Cannot read membership for ${spec.displayName}: ${lookupError.message}`);

    if (existing) {
      const { data, error } = await admin
        .from('household_members')
        .update({
          role: spec.role,
          status: 'active',
          joined_at: existing.joined_at ?? new Date().toISOString(),
          household_onboarding_status: 'completed',
          household_onboarding_completed_at: existing.household_onboarding_completed_at ?? new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw new Error(`Cannot update membership for ${spec.displayName}: ${error.message}`);
      members[spec.key] = data;
    } else {
      const { data, error } = await admin
        .from('household_members')
        .insert({
          household_id: household.id,
          person_id: person.id,
          role: spec.role,
          status: 'active',
          joined_at: new Date().toISOString(),
          household_onboarding_status: 'completed',
          household_onboarding_completed_at: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (error) throw new Error(`Cannot create membership for ${spec.displayName}: ${error.message}`);
      members[spec.key] = data;
    }

    const { error: updateError } = await admin
      .from('people')
      .update({ active_household_id: household.id })
      .eq('id', person.id);
    if (updateError) throw new Error(`Cannot set active household for ${spec.displayName}: ${updateError.message}`);
  }
  return members;
}

async function signInUsers() {
  const sessions = {};
  for (const spec of QA_USERS) {
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await authClient.auth.signInWithPassword({
      email: spec.email,
      password: QA_PASSWORD,
    });
    if (error) throw new Error(`Cannot sign in ${spec.email}: ${error.message}`);
    sessions[spec.key] = {
      authUser: data.user,
      accessToken: data.session.access_token,
      client: createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        },
      }),
    };
  }
  return sessions;
}

async function loadNativeCategories(ctx) {
  const { data, error } = await ctx.client
    .from('finance_categories')
    .select('id,native_key,label,category_type,category_kind,deleted_at')
    .eq('category_kind', 'native')
    .in('native_key', nativeCategoryKeys)
    .is('deleted_at', null);
  if (error) throw new Error(`Cannot read native Finance categories: ${error.message}`);

  const byKey = {};
  for (const row of data ?? []) byKey[row.native_key] = row;
  for (const key of nativeCategoryKeys) {
    if (!byKey[key]) throw new Error(`Missing native Finance category: ${key}`);
  }
  return byKey;
}

function scopedRequest(ctx, table, select) {
  let request = ctx.client.from(table).select(select);
  if (ctx.contextType === 'personal') {
    request = request
      .eq('financial_context_type', 'personal')
      .eq('owner_person_id', ctx.personId)
      .is('household_id', null);
  } else {
    request = request
      .eq('financial_context_type', 'household')
      .eq('household_id', ctx.householdId)
      .is('owner_person_id', null);
  }
  return request;
}

async function readPaymentDues(ctx) {
  const { data, error } = await scopedRequest(ctx, 'finance_payment_dues', `
    id,title,kind,status,currency,expected_amount_known,expected_amount,due_date,
    category_id,target_credit_card_account_id,payment_series_id,cycle_close_date,
    expense_root_transaction_id,transfer_id,actual_amount,actual_date,paid_at
  `).order('due_date', { ascending: true }).order('created_at', { ascending: true });
  if (error) throw new Error(`Cannot verify Payment Dues: ${error.message}`);
  return data ?? [];
}

async function readPaymentSeries(ctx) {
  const { data, error } = await scopedRequest(ctx, 'finance_payment_series', `
    id,title,kind,status,currency,recurrence_interval_unit,recurrence_interval_count,
    recurrence_anchor_date
  `).order('title', { ascending: true });
  if (error) throw new Error(`Cannot verify Payment Series: ${error.message}`);
  return data ?? [];
}

async function readSettlementRows(ctx, dueId) {
  const { data, error } = await ctx.client
    .from('finance_payment_due_settlements')
    .select('id,payment_due_id,transfer_id,finance_transfers(source_amount,destination_amount,source_currency,destination_currency)')
    .eq('payment_due_id', dueId);
  if (error) throw new Error(`Cannot verify Payment Due settlements: ${error.message}`);
  return data ?? [];
}

async function accountBalanceText(ctx, accountId) {
  const { data, error } = await ctx.client.rpc('finance_account_current_balance_text', {
    p_account_id: accountId,
  });
  if (error) throw new Error(`Cannot verify account balance: ${error.message}`);
  return data === null || data === undefined ? null : String(data);
}

function countBy(rows, field) {
  return rows.reduce((acc, row) => {
    const key = row[field] ?? 'null';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

async function verifyStage4PaymentSeed(contexts, accounts, artifacts) {
  const householdDues = await readPaymentDues(contexts.household);
  const personalDues = await readPaymentDues(contexts.sofiaPersonal);
  const householdSeries = await readPaymentSeries(contexts.household);
  const personalSeries = await readPaymentSeries(contexts.sofiaPersonal);
  const allDues = [...householdDues, ...personalDues];
  const today = dateDays(0);

  const findDue = (id) => allDues.find((row) => row.id === id);
  const partialDue = findDue(artifacts.partialCardDueId);
  const paidMismatchDue = findDue(artifacts.paidMismatchDueId);
  const cancelledDue = findDue(artifacts.cancelledDueId);
  const recurringDue = findDue(artifacts.recurringDueId);
  const partialSettlements = partialDue ? await readSettlementRows(contexts.sofiaPersonal, partialDue.id) : [];
  const partialPaid = partialSettlements.reduce((sum, row) => {
    const transfer = Array.isArray(row.finance_transfers) ? row.finance_transfers[0] : row.finance_transfers;
    return sum + Number(transfer?.destination_amount ?? 0);
  }, 0);

  const normalPending = allDues.filter((row) => row.kind === 'NORMAL' && row.status === 'PENDING');
  const cardDues = allDues.filter((row) => row.kind === 'CREDIT_CARD');
  const amexDueCount = cardDues.filter((row) => row.target_credit_card_account_id === accounts.personalAmexUsd.id).length;
  const visaPriorityDues = cardDues.filter((row) => row.target_credit_card_account_id === accounts.personalVisa.id);

  return {
    localApi: SUPABASE_URL,
    localDb: LOCAL_DB_URL.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@'),
    today,
    accountBalances: {
      personalMercadoPagoArs: await accountBalanceText(contexts.sofiaPersonal, accounts.personalMp.id),
      personalGaliciaArs: await accountBalanceText(contexts.sofiaPersonal, accounts.personalGalicia.id),
      personalUsd: await accountBalanceText(contexts.sofiaPersonal, accounts.personalUsd.id),
      householdCuentaFamiliarArs: await accountBalanceText(contexts.household, accounts.householdFamilyArs.id),
      householdAhorroFamiliarUsd: await accountBalanceText(contexts.household, accounts.householdFamilyUsd.id),
      visaPersonalArs: await accountBalanceText(contexts.sofiaPersonal, accounts.personalVisa.id),
      mastercardPersonalArs: await accountBalanceText(contexts.sofiaPersonal, accounts.personalMastercard.id),
      amexUsdPersonal: await accountBalanceText(contexts.sofiaPersonal, accounts.personalAmexUsd.id),
      zeroDebtCard: await accountBalanceText(contexts.sofiaPersonal, accounts.personalZeroCard.id),
      positiveBalanceCard: await accountBalanceText(contexts.sofiaPersonal, accounts.personalPositiveCard.id),
    },
    dueCounts: {
      total: allDues.length,
      byStatus: countBy(allDues, 'status'),
      byKind: countBy(allDues, 'kind'),
      household: householdDues.length,
      personal: personalDues.length,
    },
    normalPayments: {
      pendingOverdue: normalPending.filter((row) => row.due_date < today).length,
      pendingToday: normalPending.filter((row) => row.due_date === today).length,
      pendingUpcoming: normalPending.filter((row) => row.due_date > today).length,
      unknownAmount: allDues.filter((row) => row.kind === 'NORMAL' && row.expected_amount_known === false).length,
      paidExpectedVsActual: Boolean(
        paidMismatchDue
        && paidMismatchDue.status === 'PAID'
        && String(paidMismatchDue.expected_amount) !== String(paidMismatchDue.actual_amount)
        && paidMismatchDue.expense_root_transaction_id
      ),
      cancelledOccurrence: cancelledDue?.status === 'CANCELLED',
    },
    recurring: {
      activeSeries: [...householdSeries, ...personalSeries].filter((row) => row.status === 'ACTIVE').length,
      canonicalPendingDueId: recurringDue?.id ?? null,
      canonicalPendingDueDate: recurringDue?.due_date ?? null,
      onePendingPerSeriesConstraint: true,
    },
    creditCards: {
      cardDueCount: cardDues.length,
      visaPriorityDates: visaPriorityDues.map((row) => row.due_date),
      partialSettlement: {
        dueStatus: partialDue?.status ?? null,
        expectedAmount: partialDue?.expected_amount ? String(partialDue.expected_amount) : null,
        paidSoFar: partialPaid.toFixed(4).replace(/\.?0+$/, ''),
        remaining: partialDue?.expected_amount ? (Number(partialDue.expected_amount) - partialPaid).toFixed(4).replace(/\.?0+$/, '') : null,
        settlementRows: partialSettlements.length,
      },
      directUsdCardNoDue: amexDueCount === 0,
      directUsdCardAllowsManualFx: accounts.personalAmexUsd.currency === 'USD' && accounts.personalGalicia.currency === 'ARS',
      zeroDebtCardHasDue: cardDues.some((row) => row.target_credit_card_account_id === accounts.personalZeroCard.id),
      positiveBalanceCardHasDue: cardDues.some((row) => row.target_credit_card_account_id === accounts.personalPositiveCard.id),
    },
    unsupportedStates: {
      skippedPersisted: allDues.some((row) => row.status === 'SKIPPED'),
      skippedSeeded: false,
    },
  };
}

async function seedFinance(contexts) {
  const cats = await loadNativeCategories(contexts.household);

  const accounts = {};
  async function account(ctx, key, name, currency, accountType, amount, extras = {}) {
    const body = { name, currency, accountType, ...extras };
    if (amount !== null) {
      body.initialBalance = { amount: String(amount), effectiveDate: dateDays(-70) };
    }
    const { account: created } = await createFinanceAccount(ctx, body);
    accounts[key] = created;
    return created;
  }

  await account(contexts.household, 'cash', 'Efectivo Casa QA', 'ARS', 'ACCOUNT', '250000');
  await account(contexts.household, 'mp', 'Mercado Pago QA', 'ARS', 'ACCOUNT', '750000');
  await account(contexts.household, 'galicia', 'Banco Galicia QA', 'ARS', 'ACCOUNT', '2200000');
  await account(contexts.household, 'usd', 'Caja USD QA', 'USD', 'ACCOUNT', '850');
  await account(contexts.household, 'householdFamilyArs', 'Cuenta familiar ARS QA', 'ARS', 'ACCOUNT', '1250000');
  await account(contexts.household, 'householdFamilyUsd', 'Ahorro familiar USD QA', 'USD', 'ACCOUNT', '1200');
  await account(contexts.household, 'visa', 'Visa Galicia QA', 'ARS', 'CREDIT_CARD', '-185000', { closingDay: 18, dueDay: 28 });
  await account(contexts.household, 'zero', 'Cuenta Cero QA', 'ARS', 'ACCOUNT', '0');
  await account(contexts.household, 'negative', 'Tarjeta Negativa QA', 'ARS', 'CREDIT_CARD', '-15000', { closingDay: 3, dueDay: 13 });
  await account(contexts.household, 'unknown', 'Saldo sin establecer QA', 'ARS', 'ACCOUNT', null);
  const archived = await account(contexts.household, 'archived', 'Cuenta Archivada QA', 'ARS', 'ACCOUNT', '0');
  await archiveFinanceAccount(contexts.household, archived.id);

  await account(contexts.sofiaPersonal, 'sofiaWallet', 'Billetera Personal Sofía QA', 'ARS', 'ACCOUNT', '240000');
  await account(contexts.sofiaPersonal, 'personalMp', 'Mercado Pago Personal QA', 'ARS', 'ACCOUNT', '420000');
  await account(contexts.sofiaPersonal, 'personalGalicia', 'Galicia Personal QA', 'ARS', 'ACCOUNT', '860000');
  await account(contexts.sofiaPersonal, 'personalUsd', 'Caja de ahorro USD Personal QA', 'USD', 'ACCOUNT', '640');
  await account(contexts.sofiaPersonal, 'sofiaCard', 'Tarjeta Personal Sofía QA', 'ARS', 'CREDIT_CARD', '-42000', { closingDay: 7, dueDay: 17 });
  await account(contexts.sofiaPersonal, 'personalVisa', 'Visa Personal QA', 'ARS', 'CREDIT_CARD', '-265000', { closingDay: 10, dueDay: 20 });
  await account(contexts.sofiaPersonal, 'personalMastercard', 'Mastercard Personal QA', 'ARS', 'CREDIT_CARD', '-120000', { closingDay: 12, dueDay: 22 });
  await account(contexts.sofiaPersonal, 'personalAmexUsd', 'Amex USD Personal QA', 'USD', 'CREDIT_CARD', '-420', { closingDay: 15, dueDay: 25 });
  await account(contexts.sofiaPersonal, 'personalZeroCard', 'Visa Cero Personal QA', 'ARS', 'CREDIT_CARD', '0', { closingDay: 8, dueDay: 18 });
  await account(contexts.sofiaPersonal, 'personalPositiveCard', 'Mastercard Saldo a Favor QA', 'ARS', 'CREDIT_CARD', '28000', { closingDay: 5, dueDay: 15 });
  await account(contexts.martinPersonal, 'martinWallet', 'Billetera Personal Martín QA', 'ARS', 'ACCOUNT', '180000');

  const expenses = {};
  async function expense(key, ctx, description, amount, currency, days, categoryKey, accountKey, notes = null) {
    const { transaction } = await createExpense(ctx, {
      amount: String(amount),
      currency,
      date: dateDays(days),
      description,
      notes,
      category: cats[categoryKey].id,
      account: accounts[accountKey]?.id,
    });
    expenses[key] = transaction;
    return transaction;
  }

  const incomes = {};
  async function income(key, ctx, description, amount, currency, days, categoryKey, accountKey, notes = null) {
    const { transaction } = await createIncome(ctx, {
      amount: String(amount),
      currency,
      date: dateDays(days),
      description,
      notes,
      category: cats[categoryKey].id,
      account: accounts[accountKey]?.id,
    });
    incomes[key] = transaction;
    return transaction;
  }

  await income('sofiaSalaryOld', contexts.household, 'Sueldo Sofía QA julio', '780000', 'ARS', -60, 'salary', 'galicia');
  await income('martinSalaryOld', contexts.household, 'Sueldo Martín QA julio', '690000', 'ARS', -58, 'salary', 'galicia');
  await expense('rentOld', contexts.household, 'Alquiler QA julio', '420000', 'ARS', -57, 'housing', 'galicia');
  await expense('cotoOld', contexts.household, 'Supermercado Coto QA julio', '112000', 'ARS', -53, 'food', 'mp');
  await expense('schoolOld', contexts.household, 'Cuota colegio QA julio', '135000', 'ARS', -48, 'education', 'galicia');
  await expense('gasOld', contexts.household, 'Gas Naturgy QA julio', '28000', 'ARS', -45, 'utilities', 'galicia');
  await expense('fuelOld', contexts.household, 'Nafta QA julio', '48000', 'ARS', -41, 'transport', 'mp');

  await income('sofiaSalaryAug', contexts.household, 'Sueldo Sofía QA agosto', '800000', 'ARS', -31, 'salary', 'galicia');
  await income('martinSalaryAug', contexts.household, 'Sueldo Martín QA agosto', '710000', 'ARS', -30, 'salary', 'galicia');
  await expense('rentAug', contexts.household, 'Alquiler QA agosto', '430000', 'ARS', -30, 'housing', 'galicia');
  await expense('marketAug', contexts.household, 'Mercado barrio QA', '37000', 'ARS', -28, 'food', 'cash');
  await expense('healthAug', contexts.household, 'Farmacia reintegro QA', '28000', 'ARS', -25, 'health', 'mp');
  await expense('returnedBuy', contexts.household, 'Compra devuelta QA', '18000', 'ARS', -23, 'shopping', 'mp');
  await expense('shoesCard', contexts.household, 'Zapatillas con Visa QA', '76000', 'ARS', -20, 'shopping', 'visa');
  await expense('transportAug', contexts.household, 'SUBE QA agosto', '18000', 'ARS', -17, 'transport', 'mp');
  await expense('leisureAug', contexts.household, 'Cine familiar QA', '31000', 'ARS', -15, 'leisure', 'cash');
  await income('bikeSale', contexts.household, 'Venta bici QA', '145000', 'ARS', -14, 'sales', 'mp');

  await income('sofiaSalary', contexts.household, 'Sueldo Sofía QA', '820000', 'ARS', -4, 'salary', 'galicia');
  await income('martinSalary', contexts.household, 'Sueldo Martín QA', '730000', 'ARS', -3, 'salary', 'galicia');
  await income('healthReturn', contexts.household, 'Reintegro obra social QA', '12000', 'ARS', -2, 'returns', 'mp');
  await expense('coto', contexts.household, 'Supermercado Coto QA', '92000', 'ARS', -2, 'food', 'mp');
  await expense('internet', contexts.household, 'Internet QA', '39000', 'ARS', -1, 'utilities', 'galicia');
  await expense('power', contexts.household, 'Luz Edesur QA', '52000', 'ARS', -1, 'utilities', 'galicia');
  await expense('fuel', contexts.household, 'Combustible mal cargado QA', '25000', 'ARS', -1, 'transport', 'mp');
  await expense('netflix', contexts.household, 'Netflix QA', '14999', 'ARS', -1, 'subscriptions', 'visa');
  await expense('meal', contexts.household, 'Comida fuera QA', '42000', 'ARS', 0, 'leisure', 'cash');
  await expense('school', contexts.household, 'Compra escolar QA', '66000', 'ARS', 0, 'education', 'mp');
  await expense('cancelled', contexts.household, 'Gasto cancelado QA', '19900', 'ARS', 0, 'shopping', 'mp');
  await expense('usdExpense', contexts.household, 'Compra en USD QA', '45', 'USD', -9, 'shopping', 'usd');

  await expense('privateSofia', contexts.sofiaPersonal, 'Gasto privado Sofía QA', '18500', 'ARS', -5, 'leisure', 'sofiaWallet');
  await income('freelanceSofia', contexts.sofiaPersonal, 'Ingreso freelance Sofía QA', '160000', 'ARS', -4, 'independent_work', 'sofiaWallet');
  await expense('coffeeSofia', contexts.sofiaPersonal, 'Café personal Sofía QA', '3900', 'ARS', -1, 'food', 'sofiaWallet');
  await expense('privateMartin', contexts.martinPersonal, 'Gasto privado Martín QA', '22000', 'ARS', -2, 'shopping', 'martinWallet');

  await correctTransaction(contexts.household, {
    transactionId: expenses.fuel.id,
    amount: '27000',
    currency: 'ARS',
    transactionDate: dateDays(-1),
    description: 'Combustible corregido QA',
    categoryId: cats.transport.id,
    accountId: accounts.mp.id,
    notes: 'Corrección sembrada para QA manual.',
    ...mutation('correct-fuel'),
  });
  await trashFinanceTransaction(contexts.household, {
    transactionId: expenses.cancelled.id,
    ...mutation('trash-cancelled-expense'),
  });

  const refund1 = await createRefund(contexts.household, {
    transactionId: expenses.healthAug.id,
    amount: '10000',
    effectiveDate: dateDays(-18),
    ...mutation('refund-health'),
  });
  await correctRefund(contexts.household, {
    refundEventId: refund1.refund.id,
    amount: '12000',
    effectiveDate: dateDays(-18),
    ...mutation('correct-refund-health'),
  });
  await createRefund(contexts.household, {
    transactionId: expenses.returnedBuy.id,
    amount: '18000',
    effectiveDate: dateDays(-19),
    ...mutation('refund-returned-buy'),
  });

  await createTransfer(contexts.household, {
    sourceAccount: accounts.galicia.id,
    destinationAccount: accounts.mp.id,
    amount: '150000',
    date: dateDays(-10),
    description: 'Banco a Mercado Pago QA',
    notes: 'Transferencia hogar misma moneda.',
  }, mutation('transfer-bank-mp'));
  await createTransfer(contexts.household, {
    sourceAccount: accounts.mp.id,
    destinationAccount: accounts.cash.id,
    amount: '30000',
    date: dateDays(-8),
    description: 'Mercado Pago a Efectivo QA',
  }, mutation('transfer-mp-cash'));
  await createTransfer(contexts.household, {
    sourceAccount: accounts.galicia.id,
    destinationAccount: accounts.visa.id,
    amount: '120000',
    date: dateDays(-6),
    description: 'Pago Visa Galicia QA',
  }, mutation('transfer-pay-visa'));
  await createTransfer(contexts.household, {
    sourceAccount: accounts.mp.id,
    destinationAccount: accounts.galicia.id,
    amount: '20000',
    date: dateDays(-3),
    description: 'Transferencia con comisión QA',
    commissionAmount: '450',
  }, mutation('transfer-with-commission'));
  await createTransfer(contexts.household, {
    sourceAccount: accounts.galicia.id,
    destinationAccount: accounts.usd.id,
    sourceAmount: '50000',
    destinationAmount: '50',
    date: dateDays(-2),
    description: 'Ahorro USD QA',
  }, mutation('transfer-cross-currency-usd'));

  await correctAccountBalance(contexts.household, accounts.zero.id, {
    correctedBalance: '0',
    effectiveDate: dateDays(-1),
    ...mutation('correct-zero-balance'),
  });
  await correctAccountBalance(contexts.household, accounts.negative.id, {
    correctedBalance: '-12000',
    effectiveDate: dateDays(-1),
    ...mutation('correct-negative-balance'),
  });

  const supermarketPool = (await createPool(contexts.household, { name: 'Supermercado QA', currency: 'ARS' }, mutation('pool-supermarket'))).pool;
  const vacationPool = (await createPool(contexts.household, { name: 'Vacaciones QA', currency: 'ARS' }, mutation('pool-vacation'))).pool;
  const emergencyPool = (await createPool(contexts.household, { name: 'Emergencias QA', currency: 'ARS' }, mutation('pool-emergency'))).pool;
  const giftsPool = (await createPool(contexts.household, { name: 'Regalos QA', currency: 'ARS' }, mutation('pool-gifts'))).pool;
  const archivedPool = (await createPool(contexts.household, { name: 'Pozo Archivado QA', currency: 'ARS' }, mutation('pool-archive'))).pool;

  await allocatePool(contexts.household, { currency: 'ARS', poolId: supermarketPool.id, amount: '120000' }, mutation('alloc-supermarket'));
  await allocatePool(contexts.household, { currency: 'ARS', poolId: vacationPool.id, amount: '250000' }, mutation('alloc-vacation'));
  await allocatePool(contexts.household, { currency: 'ARS', poolId: emergencyPool.id, amount: '180000' }, mutation('alloc-emergency'));
  await allocatePool(contexts.household, { currency: 'ARS', poolId: giftsPool.id, amount: '35000' }, mutation('alloc-gifts'));
  await transferPool(contexts.household, {
    currency: 'ARS',
    sourcePoolId: vacationPool.id,
    destinationPoolId: emergencyPool.id,
    amount: '25000',
  }, mutation('pool-transfer-vacation-emergency'));
  await releasePool(contexts.household, { currency: 'ARS', poolId: emergencyPool.id, amount: '10000' }, mutation('pool-release-emergency'));
  await assignExpenseToPool(contexts.household, {
    expenseRootTransactionId: expenses.coto.rootTransactionId ?? expenses.coto.id,
    poolId: supermarketPool.id,
  }, mutation('assign-coto-pool'));
  await unassignExpensePool(contexts.household, {
    expenseRootTransactionId: expenses.coto.rootTransactionId ?? expenses.coto.id,
  }, mutation('unassign-coto-pool'));
  await assignExpenseToPool(contexts.household, {
    expenseRootTransactionId: expenses.coto.rootTransactionId ?? expenses.coto.id,
    poolId: supermarketPool.id,
  }, mutation('reassign-coto-pool'));
  await distributeIncomeToPools(contexts.household, {
    incomeRootTransactionId: incomes.sofiaSalary.rootTransactionId ?? incomes.sofiaSalary.id,
    currency: 'ARS',
    allocations: [
      { poolId: emergencyPool.id, amount: '100000' },
      { poolId: vacationPool.id, amount: '50000' },
    ],
  }, mutation('income-distribution-sofia'));
  await renamePool(contexts.household, giftsPool.id, { name: 'Regalos y extras QA' }, mutation('rename-gifts-pool'));
  await archivePool(contexts.household, archivedPool.id, {}, mutation('archive-empty-pool'));
  await upsertCategoryPoolDefault(contexts.household, {
    categoryId: cats.food.id,
    currency: 'ARS',
    poolId: supermarketPool.id,
  }, mutation('default-food-pool'));

  const foodLimitId = spendingLimitIdFromResult(await createSpendingLimit(contexts.household, {
    currency: 'ARS',
    scopeType: 'CATEGORY',
    categoryId: cats.food.id,
    periodType: 'MONTHLY',
    period: currentMonthKey(),
    recurrenceType: 'RECURRING',
    amount: '130000',
  }, mutation('limit-food')));
  await editSpendingLimit(contexts.household, foodLimitId, {
    amount: '125000',
    period: currentMonthKey(),
    editScope: 'THIS_PERIOD',
  }, mutation('edit-food-limit'));
  await createSpendingLimit(contexts.household, {
    currency: 'ARS',
    scopeType: 'CATEGORY',
    categoryId: cats.utilities.id,
    periodType: 'MONTHLY',
    period: currentMonthKey(),
    recurrenceType: 'ONE_OFF',
    amount: '70000',
  }, mutation('limit-utilities-over'));
  await createSpendingLimit(contexts.household, {
    currency: 'ARS',
    scopeType: 'OVERALL',
    periodType: 'MONTHLY',
    period: currentMonthKey(),
    recurrenceType: 'RECURRING',
    amount: '850000',
  }, mutation('limit-overall'));
  await createSpendingLimit(contexts.household, {
    currency: 'ARS',
    scopeType: 'CATEGORY',
    categoryId: cats.transport.id,
    periodType: 'MONTHLY',
    period: nextMonthKey(),
    recurrenceType: 'ONE_OFF',
    amount: '90000',
  }, mutation('limit-next-month-transport'));
  const yearlyLimitId = spendingLimitIdFromResult(await createSpendingLimit(contexts.household, {
    currency: 'ARS',
    scopeType: 'OVERALL',
    periodType: 'YEARLY',
    period: currentYearKey(),
    recurrenceType: 'ONE_OFF',
    amount: '9500000',
  }, mutation('limit-yearly')));
  await cancelSpendingLimit(contexts.household, yearlyLimitId, {
    period: currentYearKey(),
    cancelScope: 'ONE_OFF',
  }, mutation('cancel-yearly-limit'));

  const netflixDue = (await createOneOffPaymentDue(contexts.household, withPaymentMutation('payment-netflix', {
    title: 'Netflix QA',
    kind: 'NORMAL',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '14999',
    dueDate: dateDays(-1),
    categoryId: cats.subscriptions.id,
  }))).paymentDue;
  const stage4Artifacts = {};
  await registerPayment(contexts.household, netflixDue.id, withPaymentMutation('payment-register-netflix', {
    actualAmount: '14999',
    actualDate: dateDays(-1),
    actualCategoryId: cats.subscriptions.id,
    actualAccountId: accounts.mp.id,
  }));
  await createOneOffPaymentDue(contexts.household, withPaymentMutation('payment-internet', {
    title: 'Internet QA',
    kind: 'NORMAL',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '39000',
    dueDate: dateDays(-3),
    categoryId: cats.utilities.id,
  }));
  const powerDue = (await createOneOffPaymentDue(contexts.household, withPaymentMutation('payment-power', {
    title: 'Luz QA',
    kind: 'NORMAL',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '52000',
    dueDate: dateDays(2),
    categoryId: cats.utilities.id,
  }))).paymentDue;
  await editPaymentDue(contexts.household, powerDue.id, withPaymentMutation('payment-edit-power', {
    title: 'Luz Edesur QA',
    expectedAmountKnown: true,
    expectedAmount: '52000',
    dueDate: dateDays(2),
    categoryId: cats.utilities.id,
  }));
  await createOneOffPaymentDue(contexts.household, withPaymentMutation('payment-abl-unknown', {
    title: 'ABL QA',
    kind: 'NORMAL',
    currency: 'ARS',
    expectedAmountKnown: false,
    dueDate: dateDays(12),
    categoryId: cats.taxes.id,
  }));
  await createOneOffPaymentDue(contexts.household, withPaymentMutation('payment-card', {
    title: 'Pago tarjeta Visa QA',
    kind: 'CREDIT_CARD',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '120000',
    dueDate: dateDays(5),
    targetCreditCardAccountId: accounts.visa.id,
  }));

  const paidMismatchDue = (await createOneOffPaymentDue(contexts.household, withPaymentMutation('payment-expensas-paid-mismatch', {
    title: 'Expensas edificio QA',
    kind: 'NORMAL',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '185000',
    dueDate: dateDays(-4),
    categoryId: cats.housing.id,
  }))).paymentDue;
  await registerPayment(contexts.household, paidMismatchDue.id, withPaymentMutation('payment-register-expensas-mismatch', {
    actualAmount: '192350',
    actualDate: dateDays(-1),
    actualCategoryId: cats.housing.id,
    actualAccountId: accounts.householdFamilyArs.id,
  }));
  stage4Artifacts.paidMismatchDueId = paidMismatchDue.id;

  await createOneOffPaymentDue(contexts.household, withPaymentMutation('payment-osde-overdue', {
    title: 'OSDE familiar QA',
    kind: 'NORMAL',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '248000',
    dueDate: dateDays(-8),
    categoryId: cats.health.id,
  }));
  await createOneOffPaymentDue(contexts.household, withPaymentMutation('payment-colegio-today', {
    title: 'Cuota colegio hoy QA',
    kind: 'NORMAL',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '172000',
    dueDate: dateDays(0),
    categoryId: cats.education.id,
  }));
  await createOneOffPaymentDue(contexts.household, withPaymentMutation('payment-gas-plus2', {
    title: 'Gas Naturgy QA',
    kind: 'NORMAL',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '31500',
    dueDate: dateDays(2),
    categoryId: cats.utilities.id,
  }));
  await createOneOffPaymentDue(contexts.household, withPaymentMutation('payment-aysa-plus5', {
    title: 'AySA QA',
    kind: 'NORMAL',
    currency: 'ARS',
    expectedAmountKnown: false,
    dueDate: dateDays(5),
    categoryId: cats.utilities.id,
  }));
  await createOneOffPaymentDue(contexts.household, withPaymentMutation('payment-patente-plus10', {
    title: 'Patente auto QA',
    kind: 'NORMAL',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '68200',
    dueDate: dateDays(10),
    categoryId: cats.taxes.id,
  }));
  await createOneOffPaymentDue(contexts.household, withPaymentMutation('payment-seguro-hogar-plus20', {
    title: 'Seguro hogar QA',
    kind: 'NORMAL',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '44500',
    dueDate: dateDays(20),
    categoryId: cats.housing.id,
  }));

  await createOneOffPaymentDue(contexts.sofiaPersonal, withPaymentMutation('payment-visa-personal-overdue', {
    title: 'Visa Personal QA',
    kind: 'CREDIT_CARD',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '65000',
    dueDate: dateDays(-2),
    targetCreditCardAccountId: accounts.personalVisa.id,
  }));
  await createOneOffPaymentDue(contexts.sofiaPersonal, withPaymentMutation('payment-visa-personal-today', {
    title: 'Visa Personal QA',
    kind: 'CREDIT_CARD',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '85000',
    dueDate: dateDays(0),
    targetCreditCardAccountId: accounts.personalVisa.id,
  }));
  await createOneOffPaymentDue(contexts.sofiaPersonal, withPaymentMutation('payment-visa-personal-future', {
    title: 'Visa Personal QA',
    kind: 'CREDIT_CARD',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '94000',
    dueDate: dateDays(9),
    targetCreditCardAccountId: accounts.personalVisa.id,
  }));
  const partialCardDue = (await createOneOffPaymentDue(contexts.sofiaPersonal, withPaymentMutation('payment-mastercard-partial', {
    title: 'Mastercard Personal QA',
    kind: 'CREDIT_CARD',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '120000',
    dueDate: dateDays(3),
    targetCreditCardAccountId: accounts.personalMastercard.id,
  }))).paymentDue;
  await settleCreditCardPaymentDue(contexts.sofiaPersonal, partialCardDue.id, withPaymentMutation('payment-mastercard-partial-settlement', {
    sourceAccountId: accounts.personalGalicia.id,
    sourceAmount: '45000',
    actualDate: dateDays(0),
  }));
  stage4Artifacts.partialCardDueId = partialCardDue.id;

  const cancelledDue = (await createOneOffPaymentDue(contexts.household, withPaymentMutation('payment-monotributo-cancel', {
    title: 'Monotributo QA',
    kind: 'NORMAL',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '26000',
    dueDate: dateDays(7),
    categoryId: cats.taxes.id,
  }))).paymentDue;
  await cancelPaymentDue(contexts.household, cancelledDue.id, withPaymentMutation('payment-cancel-monotributo', {}));
  stage4Artifacts.cancelledDueId = cancelledDue.id;
  await createPaymentSeries(contexts.household, withPaymentMutation('series-seguro-auto', {
    title: 'Seguro auto QA',
    kind: 'NORMAL',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '46000',
    defaultCategoryId: cats.transport.id,
    recurrenceIntervalUnit: 'MONTH',
    recurrenceIntervalCount: 1,
    recurrenceAnchorDate: dateDays(6),
  }));
  const expensasSeries = (await createPaymentSeries(contexts.household, withPaymentMutation('series-expensas-recurrentes-stage4', {
    title: 'Expensas recurrentes QA',
    kind: 'NORMAL',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '188000',
    defaultCategoryId: cats.housing.id,
    recurrenceIntervalUnit: 'MONTH',
    recurrenceIntervalCount: 1,
    recurrenceAnchorDate: dateDays(-30),
  })));
  stage4Artifacts.recurringDueId = expensasSeries.firstDue.id;
  const gymSeries = (await createPaymentSeries(contexts.household, withPaymentMutation('series-gimnasio', {
    title: 'Gimnasio QA',
    kind: 'NORMAL',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '33000',
    defaultCategoryId: cats.health.id,
    recurrenceIntervalUnit: 'MONTH',
    recurrenceIntervalCount: 1,
    recurrenceAnchorDate: dateDays(9),
  }))).paymentSeries;
  await cancelPaymentSeries(contexts.household, gymSeries.id, withPaymentMutation('series-cancel-gimnasio', {}));

  const movements = await listFinanceMovements(contexts.household, {
    period: currentMonthKey(),
    currency: 'ARS',
  });
  const summary = await summarizeFinance(contexts.household, {
    period: currentMonthKey(),
    currency: 'ARS',
  });
  const stage4Verification = await verifyStage4PaymentSeed(contexts, accounts, stage4Artifacts);

  return {
    accounts,
    categories: cats,
    expenses,
    incomes,
    poolNames: ['Supermercado QA', 'Vacaciones QA', 'Emergencias QA', 'Regalos y extras QA', 'Pozo Archivado QA'],
    movementCount: movements.movements.length,
    summary,
    stage4Verification,
  };
}

// ---------------------------------------------------------------------------
// P2.2A — Presets Foundation seed
// ---------------------------------------------------------------------------

/**
 * Deterministic UUID for a global HomePlus preset so reruns UPSERT instead of
 * duplicating (contract: seed must be idempotent and never reset data).
 */
function homeplusPresetUuid(key) {
  const hash = crypto.createHash('sha256').update(`homeplus-planner-preset-v1:${key}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

/** Deterministic UUID for a household-scoped QA preset (idempotent reruns). */
function householdPresetUuid(householdId, key) {
  const hash = crypto.createHash('sha256').update(`homeplus-qa-household-preset-v1:${householdId}:${key}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Built-in HomePlus task presets (frozen P2.2A starter set).
 * Stable fields only — NO assignee/date/time/Plan anywhere.
 */
const HOMEPLUS_TASK_PRESETS = [
  {
    key: 'shopping',
    name: 'Hacer una compra',
    payload: {
      title: 'Hacer una compra',
      note: 'Definí qué hay que comprar y dónde antes de salir.',
      template_key: 'shopping',
      category: 'Compras',
      priority: 'normal',
      estimated_duration_minutes: 30,
      checklist: [{ text: 'Confirmar qué hay que comprar' }, { text: 'Hacer la compra' }, { text: 'Guardar el comprobante' }],
      requires_verification: false,
      requires_evidence: false,
    },
  },
  {
    key: 'invoice',
    name: 'Pagar una factura',
    payload: {
      title: 'Pagar una factura',
      note: 'Tené a mano la factura y el medio de pago.',
      template_key: 'payments',
      category: 'Pagos',
      priority: 'high',
      estimated_duration_minutes: 15,
      checklist: [{ text: 'Buscar la factura' }, { text: 'Hacer el pago' }, { text: 'Guardar comprobante' }],
      requires_verification: false,
      requires_evidence: false,
    },
  },
  {
    key: 'appointment',
    name: 'Llamar / pedir turno',
    payload: {
      title: 'Llamar o pedir un turno',
      note: 'Buscá el contacto y anotá fecha y hora si te dan turno.',
      template_key: null,
      category: 'General',
      priority: 'normal',
      estimated_duration_minutes: 15,
      checklist: [{ text: 'Buscar el contacto' }, { text: 'Llamar o escribir' }, { text: 'Anotar lo acordado' }],
      requires_verification: false,
      requires_evidence: false,
    },
  },
  {
    key: 'medication',
    name: 'Comprar medicamentos',
    payload: {
      title: 'Comprar medicamentos',
      note: 'Revisá la receta o indicación antes de comprar.',
      template_key: 'medication',
      category: 'Medicacion',
      priority: 'high',
      estimated_duration_minutes: 30,
      checklist: [{ text: 'Revisar receta' }, { text: 'Ir a la farmacia' }, { text: 'Guardar comprobante' }],
      requires_verification: false,
      requires_evidence: false,
    },
  },
  {
    key: 'service',
    name: 'Llevar algo al service',
    payload: {
      title: 'Llevar algo al service',
      note: 'Juntá el equipo, cargador y comprobantes antes de ir.',
      template_key: null,
      category: 'General',
      priority: 'normal',
      estimated_duration_minutes: 45,
      checklist: [{ text: 'Juntar el equipo y accesorios' }, { text: 'Llevar al service' }, { text: 'Guardar el comprobante de ingreso' }],
      requires_verification: false,
      requires_evidence: true,
    },
  },
  {
    key: 'backpack',
    name: 'Preparar mochila / bolso',
    payload: {
      title: 'Preparar mochila o bolso',
      note: 'Revisá contra la lista antes de cerrar.',
      template_key: 'studies',
      category: 'Estudios',
      priority: 'normal',
      estimated_duration_minutes: 10,
      checklist: [{ text: 'Revisar qué hace falta' }, { text: 'Cargar todo' }, { text: 'Cerrar y dejar listo' }],
      requires_verification: false,
      requires_evidence: false,
    },
  },
  {
    key: 'paperwork',
    name: 'Resolver un trámite',
    payload: {
      title: 'Resolver un trámite',
      note: 'Confirmá requisitos y horarios antes de empezar.',
      template_key: null,
      category: 'General',
      priority: 'normal',
      estimated_duration_minutes: 60,
      checklist: [{ text: 'Reunir documentación' }, { text: 'Iniciar el trámite' }, { text: 'Guardar constancia' }],
      requires_verification: false,
      requires_evidence: true,
    },
  },
];

/**
 * Insert/refresh the global HomePlus presets (idempotent by deterministic
 * UUID) + two household presets for the QA household (recreated each rerun
 * along with the rest of the household-scoped QA data).
 */
async function seedPlannerPresets(admin, household, people, members) {
  const now = new Date().toISOString();

  // --- HomePlus (global, read-only for users) ---
  for (const spec of HOMEPLUS_TASK_PRESETS) {
    const presetId = homeplusPresetUuid(spec.key);
    const revisionId = homeplusPresetUuid(`${spec.key}:revision:1`);
    const envelope = buildPayloadEnvelope('task', 'planner.task.template.v1', spec.payload);
    const fingerprint = structuralFingerprint(spec.payload);
    const { error: presetError } = await admin
      .from('planner_presets')
      .upsert({
        id: presetId,
        entity_type: 'task',
        source: 'homeplus',
        owner_person_id: null,
        household_id: null,
        name: spec.name,
      }, { onConflict: 'id' });
    if (presetError) throw new Error(`Cannot seed HomePlus preset "${spec.name}": ${presetError.message}`);
    const { error: revisionError } = await admin
      .from('planner_preset_revisions')
      .upsert({
        id: revisionId,
        preset_id: presetId,
        revision_number: 1,
        revision_state: 'published',
        adapter_key: envelope.adapter_key,
        payload_schema: envelope.payload_schema,
        payload_version: envelope.payload_version,
        payload: envelope.payload,
        structural_fingerprint: fingerprint,
        published_at: now,
      }, { onConflict: 'id' });
    if (revisionError) throw new Error(`Cannot seed HomePlus preset revision "${spec.name}": ${revisionError.message}`);
    const { error: linkError } = await admin
      .from('planner_presets')
      .update({ active_revision_id: revisionId })
      .eq('id', presetId);
    if (linkError) throw new Error(`Cannot link HomePlus preset revision "${spec.name}": ${linkError.message}`);
  }

  // --- Household presets (QA household; deterministic UUIDs make reruns
  // idempotent: full-seed cleanup also deletes them, presets-only upserts) ---
  const householdPresetRows = [
    {
      key: 'weekly-shopping',
      name: 'Compra semanal del hogar QA',
      payload: {
        title: 'Compra semanal del hogar',
        note: 'Hacer la compra grande de la semana entre las personas que puedan.',
        template_key: 'shopping',
        category: 'Compras',
        priority: 'normal',
        estimated_duration_minutes: 75,
        checklist: [{ text: 'Armar la lista' }, { text: 'Hacer la compra' }, { text: 'Guardar tickets' }],
        requires_verification: false,
        requires_evidence: false,
      },
    },
    {
      key: 'payments-review',
      name: 'Revisión de pagos del hogar QA',
      payload: {
        title: 'Revisión de pagos del hogar',
        note: 'Recorrido por las facturas y vencimientos del hogar.',
        template_key: 'payments',
        category: 'Pagos',
        priority: 'high',
        estimated_duration_minutes: 20,
        checklist: [{ text: 'Revisar vencimientos' }, { text: 'Registrar pagos hechos' }],
        requires_verification: true,
        requires_evidence: false,
      },
    },
  ];

  for (const spec of householdPresetRows) {
    const presetId = householdPresetUuid(household.id, spec.key);
    const revisionId = householdPresetUuid(household.id, `${spec.key}:revision:1`);
    const envelope = buildPayloadEnvelope('task', 'planner.task.template.v1', spec.payload);
    const fingerprint = structuralFingerprint(spec.payload);
    const { error: presetError } = await admin
      .from('planner_presets')
      .upsert({
        id: presetId,
        entity_type: 'task',
        source: 'household',
        owner_person_id: null,
        household_id: household.id,
        created_by_person_id: people.sofia.id,
        created_by_member_id: members.sofia.id,
        name: spec.name,
      }, { onConflict: 'id' });
    if (presetError) throw new Error(`Cannot seed household preset "${spec.name}": ${presetError.message}`);
    const { error: revisionError } = await admin
      .from('planner_preset_revisions')
      .upsert({
        id: revisionId,
        preset_id: presetId,
        revision_number: 1,
        revision_state: 'published',
        adapter_key: envelope.adapter_key,
        payload_schema: envelope.payload_schema,
        payload_version: envelope.payload_version,
        payload: envelope.payload,
        structural_fingerprint: fingerprint,
        created_by_person_id: people.sofia.id,
        created_by_member_id: members.sofia.id,
        published_at: now,
      }, { onConflict: 'id' });
    if (revisionError) throw new Error(`Cannot seed household preset revision "${spec.name}": ${revisionError.message}`);
    const { error: linkError } = await admin
      .from('planner_presets')
      .update({ active_revision_id: revisionId })
      .eq('id', presetId);
    if (linkError) throw new Error(`Cannot link household preset revision "${spec.name}": ${linkError.message}`);
  }

  console.log(`Presets seeded: ${HOMEPLUS_TASK_PRESETS.length} HomePlus + ${householdPresetRows.length} household.`);
}

async function seedWholeApp(admin, people, household, members) {
  const now = new Date().toISOString();
  const taskRows = [
    {
      household_id: household.id,
      title: 'Comprar frutas QA',
      description: 'Pasar por la verdulería del barrio.',
      status: 'pending',
      priority: 'normal',
      template_key: 'shopping',
      category: 'compras',
      due_date: dateDays(1),
      due_time: '18:30',
      requires_verification: false,
      created_by_member_id: members.sofia.id,
      created_by_person_id: people.sofia.id,
      assigned_to_member_id: members.martin.id,
    },
    {
      household_id: household.id,
      title: 'Sacar residuos QA',
      description: 'Recordatorio nocturno para probar tareas recurrentes.',
      status: 'completed',
      priority: 'low',
      template_key: 'cleaning',
      category: 'casa',
      due_date: dateDays(-1),
      due_time: '21:00',
      requires_verification: false,
      created_by_member_id: members.sofia.id,
      created_by_person_id: people.sofia.id,
      assigned_to_member_id: members.sofia.id,
      completed_by_member_id: members.sofia.id,
      completed_by_person_id: people.sofia.id,
      completed_at: now,
    },
    {
      household_id: household.id,
      title: 'Revisar mochila QA',
      description: 'Validar el flujo con verificación de adulto.',
      status: 'awaiting_verification',
      priority: 'high',
      template_key: 'studies',
      category: 'familia',
      due_date: dateDays(0),
      due_time: '20:00',
      requires_verification: true,
      created_by_member_id: members.sofia.id,
      created_by_person_id: people.sofia.id,
      assigned_to_member_id: members.luna.id,
      completed_by_member_id: members.luna.id,
      completed_by_person_id: people.luna.id,
      completed_at: now,
    },
    {
      household_id: household.id,
      title: 'Pagar Internet QA',
      description: 'Dato espejo para que el hogar también tenga una tarea financiera.',
      status: 'pending',
      priority: 'high',
      template_key: 'payments',
      category: 'finanzas',
      due_date: dateDays(1),
      due_time: '10:00',
      requires_verification: true,
      created_by_member_id: members.sofia.id,
      created_by_person_id: people.sofia.id,
      assigned_to_member_id: members.sofia.id,
    },
  ];

  const { error: taskError } = await admin.from('planner_tasks').insert(taskRows);
  if (taskError) throw new Error(`Cannot seed planner tasks: ${taskError.message}`);

  const responsibilityRows = [
    ['trash', 'Sacar la basura', 'fixed', 'weekdays', 1, null, [2, 5], null, 'active', null],
    ['kitchen', 'Ordenar cocina', 'fixed', 'weekdays', 1, null, [6], null, 'active', null],
    ['dishes', 'Lavar los platos', 'rotation', 'daily', 1, null, [], null, 'active', null],
    ['plants', 'Regar las plantas', 'claimable', 'weekdays', 1, null, [1, 3, 6], null, 'active', null],
    ['patio', 'Limpiar patio', 'unassigned', 'weekdays', 1, null, [6], null, 'active', null],
    ['filter', 'Cambiar filtro', 'fixed', 'after_completion', 3, 'months', [], null, 'active', null],
    ['paused', 'Limpiar ventanas', 'fixed', 'monthly', 1, null, [], 15, 'paused', null],
    ['adjust', 'Ordenar depósito', 'rotation', 'daily', 1, null, [], null, 'active', 'La rotación necesita al menos 2 integrantes.'],
  ].map(([key, title, assignmentKind, scheduleKind, interval, unit, weekdays, monthDay, lifecycle, adjustment]) => ({
    household_id: household.id, title, description: `QA ${key}`, lifecycle,
    assignment_kind: assignmentKind, schedule_kind: scheduleKind, schedule_interval: interval,
    schedule_unit: unit, weekdays, month_day: monthDay, anchor_date: dateDays(0), due_time: null,
    task_defaults: { priority: 'normal', requires_verification: key === 'dishes' },
    requires_adjustment_reason: adjustment, created_by_member_id: members.sofia.id,
    paused_at: lifecycle === 'paused' ? now : null,
  }));
  const { data: responsibilities, error: responsibilityError } = await admin.from('planner_responsibilities').insert(responsibilityRows).select('id,description');
  if (responsibilityError) throw new Error(`Cannot seed planner responsibilities: ${responsibilityError.message}`);
  const memberRules = {
    trash: [members.tomi.id], kitchen: [members.sofia.id, members.martin.id],
    dishes: [members.sofia.id, members.tomi.id], filter: [members.martin.id],
    paused: [members.sofia.id], adjust: [members.tomi.id],
  };
  const responsibilityMemberRows = (responsibilities ?? []).flatMap((row) => {
    const key = String(row.description).replace('QA ', '');
    return (memberRules[key] ?? []).map((memberId, position) => ({ responsibility_id: row.id, household_id: household.id, member_id: memberId, position }));
  });
  const { error: responsibilityMemberError } = await admin.from('planner_responsibility_members').insert(responsibilityMemberRows);
  if (responsibilityMemberError) throw new Error(`Cannot seed planner responsibility members: ${responsibilityMemberError.message}`);

  const eventRows = [
    {
      household_id: household.id,
      title: 'Turno pediatra QA',
      description: 'Consulta anual de Tomi.',
      status: 'active',
      starts_at: `${dateDays(2)}T13:30:00.000Z`,
      ends_at: `${dateDays(2)}T14:15:00.000Z`,
      all_day: false,
      location_name: 'Consultorio QA',
      recurrence: 'none',
      created_by_person_id: people.sofia.id,
    },
    {
      household_id: household.id,
      title: 'Cena familiar QA',
      description: 'Evento para validar calendario compartido.',
      status: 'active',
      starts_at: `${dateDays(4)}T23:00:00.000Z`,
      ends_at: `${dateDays(5)}T01:00:00.000Z`,
      all_day: false,
      location_name: 'Casa QA',
      recurrence: 'none',
      created_by_person_id: people.martin.id,
    },
    {
      household_id: household.id,
      title: 'Compra semanal QA',
      description: 'Bloque visible de planificación doméstica.',
      status: 'active',
      starts_at: `${dateDays(6)}T14:00:00.000Z`,
      ends_at: `${dateDays(6)}T16:00:00.000Z`,
      all_day: false,
      location_name: 'Supermercado Coto QA',
      recurrence: 'none',
      created_by_person_id: people.sofia.id,
    },
  ];
  const { error: eventError } = await admin.from('planner_events').insert(eventRows);
  if (eventError) throw new Error(`Cannot seed planner events: ${eventError.message}`);

  const schedulePreferenceRows = [members.sofia, members.martin, members.luna, members.tomi].map((member) => ({
    household_id: household.id,
    person_id: member.person_id,
    is_visible_to_household: true,
  }));
  const { error: schedulePreferenceError } = await admin
    .from('household_schedule_preferences')
    .upsert(schedulePreferenceRows, { onConflict: 'household_id,person_id' });
  if (schedulePreferenceError) throw new Error(`Cannot seed schedule preferences: ${schedulePreferenceError.message}`);

  const scheduleRows = [
    {
      household_id: household.id,
      person_id: people.sofia.id,
      title: 'Trabajo Sofía QA',
      days_of_week: [1, 2, 3, 4, 5],
      start_minutes: 9 * 60,
      end_minutes: 17 * 60,
      color_key: 'terracotta',
      note: 'Bloque laboral visible para coordinar tareas.',
    },
    {
      household_id: household.id,
      person_id: people.martin.id,
      title: 'Facultad Martín QA',
      days_of_week: [2, 4],
      start_minutes: 18 * 60,
      end_minutes: 21 * 60,
      color_key: 'blue',
      note: 'Horario de cursada para validar filtros por miembro.',
    },
    {
      household_id: household.id,
      person_id: people.luna.id,
      title: 'Entrenamiento Luna QA',
      days_of_week: [1, 3],
      start_minutes: 16 * 60,
      end_minutes: 17 * 60 + 30,
      color_key: 'sage',
      note: 'Bloque adolescente compartido.',
    },
  ];
  const { error: scheduleError } = await admin.from('household_schedule_blocks').insert(scheduleRows);
  if (scheduleError) throw new Error(`Cannot seed household schedules: ${scheduleError.message}`);

  const planRows = [
    {
      household_id: household.id,
      scope: 'household',
      objective: 'Preparar vacaciones QA',
      description: 'Plan familiar con fecha objetivo para validar la lista principal.',
      lifecycle: 'active',
      target_date: dateDays(45),
      finalization_kind: 'date',
      created_by_person_id: people.sofia.id,
      created_by_member_id: members.sofia.id,
      activated_at: now,
    },
    {
      household_id: household.id,
      scope: 'household',
      objective: 'Ordenar papeles de la casa QA',
      description: 'Plan en preparación para comprobar agrupación y copia.',
      lifecycle: 'draft',
      target_date: dateDays(21),
      finalization_kind: 'date',
      created_by_person_id: people.martin.id,
      created_by_member_id: members.martin.id,
    },
    {
      household_id: household.id,
      scope: 'household',
      objective: 'Renovar cuarto de Luna QA',
      description: 'Plan pausado visible en la raíz de Planes.',
      lifecycle: 'paused',
      target_date: dateDays(90),
      finalization_kind: 'date',
      created_by_person_id: people.sofia.id,
      created_by_member_id: members.sofia.id,
      paused_at: now,
    },
  ];
  const { error: planError } = await admin.from('planner_plans').insert(planRows);
  if (planError) throw new Error(`Cannot seed planner plans: ${planError.message}`);

  const legacyPlanRows = [
    {
      household_id: household.id,
      title: 'Vacaciones familiares QA',
      description: 'Plan activo visible en la raíz de Planes.',
      visibility: 'household',
      category: 'family',
      status: 'active',
      ends_at: dateDays(45),
      created_by_member_id: members.sofia.id,
    },
    {
      household_id: household.id,
      title: 'Documentos del hogar QA',
      description: 'Plan en preparación para validar el grupo inicial.',
      visibility: 'household',
      category: 'home',
      status: 'active',
      ends_at: dateDays(21),
      created_by_member_id: members.martin.id,
    },
    {
      household_id: household.id,
      title: 'Renovar cuarto QA',
      description: 'Plan pausado visible en la raíz de Planes.',
      visibility: 'household',
      category: 'home',
      status: 'active',
      ends_at: dateDays(90),
      created_by_member_id: members.sofia.id,
    },
  ];
  const { error: legacyPlanError } = await admin.from('planner_goals').insert(legacyPlanRows);
  if (legacyPlanError) throw new Error(`Cannot seed planner v1 plans: ${legacyPlanError.message}`);

  const { data: templates } = await admin
    .from('inventory_item_templates')
    .select('id,key,name')
    .in('key', ['milk', 'yerba', 'detergent', 'rice', 'oil']);
  const templatesByKey = Object.fromEntries((templates ?? []).map((row) => [row.key, row]));
  const inventoryRows = [
    ['milk', 'Leche QA', '🥛', 0, 2],
    ['yerba', 'Yerba QA', '🧉', 1, 1],
    ['detergent', 'Detergente QA', '🧼', 2, 1],
    ['rice', 'Arroz QA', '🍚', 3, 1],
    ['oil', 'Aceite QA', '🫒', 1, 1],
  ].map(([key, name, emoji, quantity, threshold]) => ({
    household_id: household.id,
    template_id: templatesByKey[key]?.id ?? null,
    name,
    emoji,
    category_key: 'kitchen',
    quantity,
    low_stock_threshold: threshold,
    created_by_person_id: people.sofia.id,
    updated_by_person_id: people.sofia.id,
  }));

  const { data: items, error: itemError } = await admin
    .from('inventory_items')
    .insert(inventoryRows)
    .select('*');
  if (itemError) throw new Error(`Cannot seed inventory items: ${itemError.message}`);

  const milk = items.find((item) => item.name === 'Leche QA');
  const { error: restockError } = await admin.from('inventory_restock_requests').insert({
    household_id: household.id,
    inventory_item_id: milk?.id ?? null,
    status: 'pending',
    suggested_title: 'Reponer leche QA',
    suggested_description: 'Queda sin stock para el desayuno.',
    requested_by_person_id: people.luna.id,
    assigned_to_person_id: people.martin.id,
  });
  if (restockError) throw new Error(`Cannot seed restock request: ${restockError.message}`);

  const presenceRows = [
    {
      household_id: household.id,
      membership_id: members.sofia.id,
      person_id: people.sofia.id,
      sharing_enabled: true,
      latitude: -34.6037,
      longitude: -58.3816,
      accuracy_meters: 25,
      recorded_at: new Date().toISOString(),
    },
    {
      household_id: household.id,
      membership_id: members.martin.id,
      person_id: people.martin.id,
      sharing_enabled: true,
      latitude: -34.5989,
      longitude: -58.4201,
      accuracy_meters: 35,
      recorded_at: new Date().toISOString(),
    },
    {
      household_id: household.id,
      membership_id: members.luna.id,
      person_id: people.luna.id,
      sharing_enabled: false,
      latitude: null,
      longitude: null,
      accuracy_meters: null,
      recorded_at: null,
    },
  ];
  const { error: presenceError } = await admin.from('presence_member_locations').upsert(presenceRows, {
    onConflict: 'membership_id',
  });
  if (presenceError) throw new Error(`Cannot seed presence: ${presenceError.message}`);

  // P2.2A — Presets Foundation seed (idempotent; no reset).
  await seedPlannerPresets(admin, household, people, members);
}

async function main() {
  const cleanupOnly = process.argv.includes('--cleanup-only');
  const presetsOnly = process.argv.includes('--presets-only');
  const targetSlugArg = process.argv.find((arg) => arg.startsWith('--target-household-slug='));
  const targetHouseholdSlug = targetSlugArg?.split('=').slice(1).join('=').trim() || null;

  assertLocalUrl(SUPABASE_URL, 'SUPABASE_URL', '56221');
  assertLocalDbUrl(LOCAL_DB_URL);
  if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    usageAndExit('Missing SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY.');
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`HomePlus QA seed: ${presetsOnly ? 'presets only (no cleanup)' : cleanupOnly ? 'cleanup only' : 'cleanup + seed'} (${HOUSEHOLD_SLUG})`);
  const authUsers = await ensureAuthUsers(admin);
  const people = await ensurePeople(admin, authUsers);

  // P2.2A focused mode: refreshes ONLY the preset rows (HomePlus upsert +
  // household presets for the QA household). Never touches tasks, finance or
  // other Planner data; runs no cleanup.
  if (presetsOnly) {
    const household = await findHouseholdBySlug(admin, targetHouseholdSlug ?? HOUSEHOLD_SLUG);
    if (!household) {
      throw new Error(`No local household found with slug "${targetHouseholdSlug ?? HOUSEHOLD_SLUG}". Run the full seed first.`);
    }
    const members = await ensureMembershipsForHousehold(admin, people, household);
    await seedPlannerPresets(admin, household, people, members);
    console.log('Preset seed complete (idempotent).');
    return;
  }

  await cleanupQaData(authUsers);

  if (cleanupOnly) {
    console.log('Cleanup complete. QA auth users were kept so the seed can be recreated quickly.');
    return;
  }

  let household;
  let members;
  if (targetHouseholdSlug) {
    household = await findHouseholdBySlug(admin, targetHouseholdSlug);
    if (!household) {
      throw new Error(`No local household found with slug "${targetHouseholdSlug}".`);
    }
    members = await ensureMembershipsForHousehold(admin, people, household);
    console.log(`Target household found: ${household.name} (${household.slug})`);
  } else {
    ({ household, members } = await createHousehold(admin, people));
  }

  const sessions = await signInUsers();
  const contexts = {
    household: makeContext(sessions.sofia, people.sofia, household, members.sofia),
    sofiaPersonal: makeContext(sessions.sofia, people.sofia),
    martinPersonal: makeContext(sessions.martin, people.martin),
  };

  const financeResult = await seedFinance(contexts);
  await seedWholeApp(admin, people, household, members);

  console.log('\nSeed complete.');
  console.log(`Household: ${household.name} (${household.slug})`);
  console.log(`Login: ${QA_USERS[0].email} / ${QA_PASSWORD}`);
  console.log(`Finance accounts created: ${Object.keys(financeResult.accounts).length}`);
  console.log(`Current month household ARS movements: ${financeResult.movementCount}`);
  console.log('Key names: Supermercado Coto QA, Internet QA, Pago tarjeta Visa QA, Supermercado QA, Vacaciones QA.');
  console.log('\nStage 4 payment QA verification:');
  console.log(JSON.stringify(financeResult.stage4Verification, null, 2));
}

main().catch((error) => {
  console.error('\nHomePlus QA seed failed.');
  console.error(error.message);
  process.exit(1);
});
