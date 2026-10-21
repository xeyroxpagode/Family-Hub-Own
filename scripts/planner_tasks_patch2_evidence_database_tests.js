#!/usr/bin/env node
'use strict'

const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { Client } = require('../backend/node_modules/pg')

const DATABASE_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:56222/postgres'
const parsed = new URL(DATABASE_URL)
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) throw new Error('Evidence DB tests are local-only')
let assertions = 0
const check = (value, message) => { assert.ok(value, message); assertions += 1; console.log(`PASS: ${message}`) }

async function runAs(client, accountId, fn) {
  await client.query(`select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.role','authenticated',false)`, [accountId])
  await client.query('set role authenticated')
  let value; let failure
  try { value = await fn() } catch (error) { failure = error }
  try { await client.query('reset role') } catch { /* preserve the original SQL error */ }
  if (failure) throw failure
  return value
}

async function account(client, label) {
  const accountId = crypto.randomUUID(); const personId = crypto.randomUUID()
  await client.query(`insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values($1,'authenticated','authenticated',$2,'',now(),'{"provider":"email","providers":["email"]}','{}',now(),now())`, [accountId, `patch2-${label}-${accountId}@example.test`])
  await client.query(`insert into public.people(id,auth_user_id,display_name,default_language,personal_settings) values($1,$2,$3,'es-419','{}')`, [personId, accountId, `Patch2 ${label}`])
  return { accountId, personId }
}

async function household(client, owner, label) {
  const id = crypto.randomUUID()
  const config = { permissions: {
    'planner.view': { coordinator: true, adult: true, guest: false },
    'task.complete_assigned': { coordinator: true, adult: true, guest: false },
    'task.complete_any': { coordinator: true, adult: false, guest: false },
    'task.verify': { coordinator: true, adult: true, guest: false },
  } }
  await client.query(`insert into public.households(id,name,slug,timezone,default_language,config,created_by_person_id)
    values($1,$2,$3,'America/Argentina/Buenos_Aires','es-419',$4,$5)`, [id, `Patch2 ${label}`, `patch2-${label}-${id}`, config, owner.personId])
  return id
}

async function member(client, householdId, who, role) {
  const id = crypto.randomUUID()
  await client.query(`insert into public.household_members(id,household_id,person_id,role,status,joined_at,household_onboarding_status,household_onboarding_completed_at)
    values($1,$2,$3,$4,'active',now(),'completed',now())`, [id, householdId, who.personId, role])
  await client.query('update public.people set active_household_id=$1 where id=$2', [householdId, who.personId])
  return id
}

async function taskFixture(client, householdId, owner, ownerMemberId, assigneeMemberId, suffix) {
  const task = (await client.query(`insert into public.planner_tasks(household_id,title,requires_verification,created_by_person_id,created_by_member_id,assigned_to_member_id)
    values($1,$2,true,$3,$4,$5) returning id`, [householdId, `Patch2 Evidence ${suffix}`, owner.personId, ownerMemberId, assigneeMemberId])).rows[0]
  const fulfillment = (await client.query(`select id,version,status from public.planner_task_fulfillments where task_id=$1 and retired_at is null and inactive_at is null`, [task.id])).rows[0]
  return { taskId: task.id, fulfillment }
}

async function artifact(client, householdId, taskId, memberId, suffix, age = '0 days') {
  return (await client.query(`insert into public.planner_task_evidence_artifacts(
      household_id,task_id,uploaded_by_member_id,storage_path,display_name,mime_type,size_bytes,state,intake_idempotency_key,confirmed_at,created_at)
    values($1,$2,$3,$4,$5,'image/jpeg',128,'confirmed',$6,now(),now()-$7::interval) returning id`,
  [householdId, taskId, memberId, `${householdId}/${taskId}/${suffix}.jpg`, `${suffix}.jpg`, `intake-${suffix}-${crypto.randomUUID()}`, age])).rows[0].id
}

async function rpc(client, name, values) {
  const params = values.map((_, index) => `$${index + 1}`).join(',')
  return (await client.query(`select public.${name}(${params}) as result`, values)).rows[0].result
}

async function expectSqlFailure(client, query, params, message) {
  await client.query('savepoint evidence_expected_failure')
  let failed = false
  try { await client.query(query, params) } catch { failed = true; await client.query('rollback to savepoint evidence_expected_failure') }
  await client.query('release savepoint evidence_expected_failure')
  check(failed, message)
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000, statement_timeout: 20000 })
  await client.connect(); await client.query('begin')
  try {
    const owner = await account(client, 'owner'); const submitter = await account(client, 'submitter'); const guest = await account(client, 'guest')
    const householdId = await household(client, owner, 'primary')
    const ownerMemberId = await member(client, householdId, owner, 'coordinator')
    const submitterMemberId = await member(client, householdId, submitter, 'adult')
    await member(client, householdId, guest, 'guest')
    const otherHouseholdId = await household(client, owner, 'other')
    await member(client, otherHouseholdId, owner, 'coordinator')

    const first = await taskFixture(client, householdId, owner, ownerMemberId, submitterMemberId, 'V1-V2')
    await expectSqlFailure(client, `update public.planner_task_fulfillments set status='awaiting_verification' where id=$1`, [first.fulfillment.id], 'verifiable fulfillment cannot bypass Evidence')
    const media1 = await artifact(client, householdId, first.taskId, submitterMemberId, 'v1-a', '8 days')
    const media2 = await artifact(client, householdId, first.taskId, submitterMemberId, 'v1-b', '8 days')
    const submitKey = `submit-${crypto.randomUUID()}`
    const v1 = await runAs(client, submitter.accountId, () => rpc(client, 'submit_planner_task_evidence_v2', [householdId, first.taskId, first.fulfillment.id, first.fulfillment.version, [media1, media2], submitKey]))
    check(v1.outcome === 'updated' && v1.version === 1, 'V1 submits with multiple media')
    const v1Shape = (await client.query(`select
      (select count(*)::int from public.planner_task_evidence_submissions where fulfillment_id=$1 and is_current) current_count,
      (select count(*)::int from public.planner_task_evidence_media where submission_id=$2) media_count`, [first.fulfillment.id, v1.submission_id])).rows[0]
    check(v1Shape.current_count === 1 && v1Shape.media_count === 2, 'one current version and both media links persist')
    const replay = await runAs(client, submitter.accountId, () => rpc(client, 'submit_planner_task_evidence_v2', [householdId, first.taskId, first.fulfillment.id, first.fulfillment.version, [media1, media2], submitKey]))
    check(replay.outcome === 'replay' && replay.submission_id === v1.submission_id, 'duplicate submit replays without duplication')
    const reuse = await runAs(client, submitter.accountId, () => rpc(client, 'submit_planner_task_evidence_v2', [householdId, first.taskId, first.fulfillment.id, first.fulfillment.version, [media1], submitKey]))
    check(reuse.outcome === 'idempotency_key_reused', 'same idempotency key rejects a different payload')
    const countsAfterReplay = (await client.query(`select (select count(*)::int from public.planner_task_evidence_submissions where fulfillment_id=$1) submissions,
      (select count(*)::int from public.planner_task_evidence_media where submission_id=$2) media`, [first.fulfillment.id, v1.submission_id])).rows[0]
    check(countsAfterReplay.submissions === 1 && countsAfterReplay.media === 2, 'double submit creates no media or submission duplicates')

    const selfReview = await runAs(client, submitter.accountId, () => rpc(client, 'review_planner_task_evidence_v2', [householdId, first.taskId, first.fulfillment.id, v1.submission_id, 1, 'approve', null]))
    check(selfReview.outcome === 'self_verification_not_allowed', 'self-review is rejected')
    const crossHousehold = await runAs(client, submitter.accountId, () => rpc(client, 'submit_planner_task_evidence_v2', [otherHouseholdId, first.taskId, first.fulfillment.id, first.fulfillment.version, [media1], `cross-${crypto.randomUUID()}`]))
    check(crossHousehold.outcome === 'planner_forbidden', 'another household is rejected')
    const noPermission = await runAs(client, guest.accountId, () => rpc(client, 'submit_planner_task_evidence_v2', [householdId, first.taskId, first.fulfillment.id, first.fulfillment.version, [media1], `guest-${crypto.randomUUID()}`]))
    check(noPermission.outcome === 'planner_forbidden', 'actor without capability is rejected')
    const emptyReason = await runAs(client, owner.accountId, () => rpc(client, 'review_planner_task_evidence_v2', [householdId, first.taskId, first.fulfillment.id, v1.submission_id, 1, 'request_correction', '   ']))
    check(emptyReason.outcome === 'correction_reason_required', 'empty correction reason is rejected')
    const corrected = await runAs(client, owner.accountId, () => rpc(client, 'review_planner_task_evidence_v2', [householdId, first.taskId, first.fulfillment.id, v1.submission_id, 1, 'request_correction', 'Mostrá el resultado final']))
    check(corrected.outcome === 'updated', 'eligible reviewer requests correction')
    const media3 = await artifact(client, householdId, first.taskId, submitterMemberId, 'v2-a')
    const correctionVersion = (await client.query('select version from public.planner_task_fulfillments where id=$1', [first.fulfillment.id])).rows[0].version
    const v2 = await runAs(client, submitter.accountId, () => rpc(client, 'submit_planner_task_evidence_v2', [householdId, first.taskId, first.fulfillment.id, correctionVersion, [media3], `submit-${crypto.randomUUID()}`]))
    check(v2.outcome === 'updated' && v2.version === 2, 'resubmit creates V2 and preserves V1')
    const versions = await client.query(`select version,is_current from public.planner_task_evidence_submissions where fulfillment_id=$1 order by version`, [first.fulfillment.id])
    check(versions.rowCount === 2 && !versions.rows[0].is_current && versions.rows[1].is_current, 'V1 history remains and only V2 is current')
    const staleReview = await runAs(client, owner.accountId, () => rpc(client, 'review_planner_task_evidence_v2', [householdId, first.taskId, first.fulfillment.id, v1.submission_id, 1, 'approve', null]))
    check(staleReview.outcome === 'stale_evidence_version', 'approve is limited to the current version')
    const approved = await runAs(client, owner.accountId, () => rpc(client, 'review_planner_task_evidence_v2', [householdId, first.taskId, first.fulfillment.id, v2.submission_id, 2, 'approve', null]))
    check(approved.outcome === 'updated', 'current V2 can be approved')

    const staleTask = await taskFixture(client, householdId, owner, ownerMemberId, submitterMemberId, 'stale')
    const staleMedia = await artifact(client, householdId, staleTask.taskId, submitterMemberId, 'stale')
    const staleSubmit = await runAs(client, submitter.accountId, () => rpc(client, 'submit_planner_task_evidence_v2', [householdId, staleTask.taskId, staleTask.fulfillment.id, staleTask.fulfillment.version + 1, [staleMedia], `stale-${crypto.randomUUID()}`]))
    check(staleSubmit.outcome === 'version_conflict', 'stale expected_version is rejected')

    const activeTask = await taskFixture(client, householdId, owner, ownerMemberId, submitterMemberId, 'active-retention')
    const oldActiveMedia = await artifact(client, householdId, activeTask.taskId, submitterMemberId, 'old-active', '8 days')
    const active = await runAs(client, submitter.accountId, () => rpc(client, 'submit_planner_task_evidence_v2', [householdId, activeTask.taskId, activeTask.fulfillment.id, activeTask.fulfillment.version, [oldActiveMedia], `active-${crypto.randomUUID()}`]))
    await client.query(`select set_config('request.jwt.claim.role','service_role',false)`); await client.query('set role service_role')
    const initiallyDue = await client.query('select * from public.claim_expired_planner_evidence_media(100)'); await client.query('reset role')
    check(!initiallyDue.rows.some((row) => row.artifact_id === oldActiveMedia), 'active Evidence is not purged even when upload is older than seven days')
    const retired = (await client.query(`select retain_until from public.planner_task_evidence_submissions where id=$1`, [v1.submission_id])).rows[0]
    check(new Date(retired.retain_until).getTime() > Date.now(), 'retired version receives a future seven-day retention date')
    check(!initiallyDue.rows.some((row) => [media1, media2].includes(row.artifact_id)), 'retired bytes remain before TTL')
    await client.query(`update public.planner_task_evidence_submissions set retain_until=now()-interval '1 second' where id=$1`, [v1.submission_id])
    await client.query(`select set_config('request.jwt.claim.role','service_role',false)`); await client.query('set role service_role')
    const due = await client.query('select * from public.claim_expired_planner_evidence_media(100)')
    check(due.rows.filter((row) => [media1, media2].includes(row.artifact_id)).length === 2, 'TTL expiry claims retired media bytes')
    await client.query(`update public.planner_task_evidence_artifacts set state='purged',purged_at=now() where id=any($1::uuid[])`, [[media1, media2]])
    await client.query(`update public.planner_task_evidence_submissions set media_purged_at=now() where id=$1`, [v1.submission_id])
    const repeated = await client.query('select * from public.claim_expired_planner_evidence_media(100)'); await client.query('reset role')
    check(!repeated.rows.some((row) => [media1, media2].includes(row.artifact_id)), 'purge claim is idempotent')
    const history = await client.query(`select count(*)::int count from public.planner_task_evidence_submissions where fulfillment_id=$1`, [first.fulfillment.id])
    check(history.rows[0].count === 2, 'logical submission history remains after byte purge')
    const activeStillPresent = await client.query(`select state from public.planner_task_evidence_artifacts where id=$1`, [oldActiveMedia])
    check(activeStillPresent.rows[0].state === 'attached' && active.submission_id, 'active media remains attached')

    console.log(`PLANNER TASKS PATCH2 EVIDENCE DB: ${assertions} assertions passed; fixtures rolled back.`)
  } finally {
    await client.query('rollback').catch(() => {}); await client.end()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
