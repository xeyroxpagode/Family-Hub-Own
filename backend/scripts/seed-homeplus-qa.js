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
      await deleteIfExists(pg, 'planner_tasks', 'delete from public.planner_tasks where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'planner_events', 'delete from public.planner_events where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'household_schedule_blocks', 'delete from public.household_schedule_blocks where household_id = $1', [householdId]);
      await deleteIfExists(pg, 'household_schedule_preferences', 'delete from public.household_schedule_preferences where household_id = $1', [householdId]);
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

async function seedFinance(contexts) {
  const cats = await loadNativeCategories(contexts.household);

  const accounts = {};
  async function account(ctx, key, name, currency, accountType, amount) {
    const body = { name, currency, accountType };
    if (amount !== null) {
      body.initialBalance = { amount: String(amount), effectiveDate: dateDays(-70) };
    }
    const { account: created } = await createFinanceAccount(ctx, body);
    accounts[key] = created;
    return created;
  }

  await account(contexts.household, 'cash', 'Efectivo Casa QA', 'ARS', 'ACCOUNT', '65000');
  await account(contexts.household, 'mp', 'Mercado Pago QA', 'ARS', 'ACCOUNT', '220000');
  await account(contexts.household, 'galicia', 'Banco Galicia QA', 'ARS', 'ACCOUNT', '980000');
  await account(contexts.household, 'usd', 'Caja USD QA', 'USD', 'ACCOUNT', '850');
  await account(contexts.household, 'visa', 'Visa Galicia QA', 'ARS', 'CREDIT_CARD', '-185000');
  await account(contexts.household, 'zero', 'Cuenta Cero QA', 'ARS', 'ACCOUNT', '0');
  await account(contexts.household, 'negative', 'Cuenta Negativa QA', 'ARS', 'ACCOUNT', '-15000');
  await account(contexts.household, 'unknown', 'Saldo sin establecer QA', 'ARS', 'ACCOUNT', null);
  const archived = await account(contexts.household, 'archived', 'Cuenta Archivada QA', 'ARS', 'ACCOUNT', '0');
  await archiveFinanceAccount(contexts.household, archived.id);

  await account(contexts.sofiaPersonal, 'sofiaWallet', 'Billetera Personal Sofía QA', 'ARS', 'ACCOUNT', '90000');
  await account(contexts.sofiaPersonal, 'sofiaCard', 'Tarjeta Personal Sofía QA', 'ARS', 'CREDIT_CARD', '-42000');
  await account(contexts.martinPersonal, 'martinWallet', 'Billetera Personal Martín QA', 'ARS', 'ACCOUNT', '70000');

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

  return {
    accounts,
    categories: cats,
    expenses,
    incomes,
    poolNames: ['Supermercado QA', 'Vacaciones QA', 'Emergencias QA', 'Regalos y extras QA', 'Pozo Archivado QA'],
    movementCount: movements.movements.length,
    summary,
  };
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
}

async function main() {
  const cleanupOnly = process.argv.includes('--cleanup-only');
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

  console.log(`HomePlus QA seed: ${cleanupOnly ? 'cleanup only' : 'cleanup + seed'} (${HOUSEHOLD_SLUG})`);
  const authUsers = await ensureAuthUsers(admin);
  const people = await ensurePeople(admin, authUsers);
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
}

main().catch((error) => {
  console.error('\nHomePlus QA seed failed.');
  console.error(error.message);
  process.exit(1);
});
