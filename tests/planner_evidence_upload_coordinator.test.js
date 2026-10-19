'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('../front/mi-front-limpio/node_modules/typescript/lib/typescript.js')

const source = fs.readFileSync(path.resolve(__dirname, '../front/mi-front-limpio/services/uploads/uploadCoordinator.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const loaded = { exports: {} }
new Function('exports', 'module', compiled)(loaded.exports, loaded)
const { UploadCoordinator } = loaded.exports

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
async function until(predicate, turns = 100) {
  for (let i = 0; i < turns; i += 1) { if (predicate()) return; await tick() }
  throw new Error('timed out')
}
const job = (id, state = 'queued') => ({ jobId: id, queueState: state, progress: 0, bytesSent: 0, totalBytes: 100 })

test('1 N jobs enter and leave the coordinator queue', async () => {
  let latest = []; const ran = []
  const queue = new UploadCoordinator({ concurrency: 2, execute: async (value) => { ran.push(value.jobId); return value }, onChange: (jobs) => { latest = jobs } })
  queue.enqueue([job('a'), job('b'), job('c')])
  await until(() => latest.every((value) => value.queueState === 'completed'))
  assert.deepEqual(ran.sort(), ['a', 'b', 'c'])
})

test('2 progress is derived from real byte counters', async () => {
  let latest = []; let release
  const queue = new UploadCoordinator({ execute: (value, controls) => new Promise((resolve) => { controls.progress(25, 100); release = () => resolve(value) }), onChange: (jobs) => { latest = jobs } })
  queue.enqueue([job('a')]); await until(() => latest[0]?.progress === 0.25)
  assert.equal(latest[0].bytesSent, 25); release(); await until(() => latest[0]?.queueState === 'completed')
})

test('3 pending job cancellation prevents execution', async () => {
  let latest = []; let ranB = false; let release
  const queue = new UploadCoordinator({ concurrency: 1, execute: (value) => value.jobId === 'a' ? new Promise((resolve) => { release = () => resolve(value) }) : Promise.resolve((ranB = true, value)), onChange: (jobs) => { latest = jobs } })
  queue.enqueue([job('a'), job('b')]); await until(() => latest[0]?.queueState === 'running'); await queue.cancel('b'); release()
  await until(() => latest.find((value) => value.jobId === 'a')?.queueState === 'completed')
  assert.equal(ranB, false); assert.equal(latest.find((value) => value.jobId === 'b').queueState, 'cancelled')
})

test('4 active cancellation invokes native cancel and cleanup', async () => {
  let latest = []; let cancelled = 0; let cleaned = 0
  const queue = new UploadCoordinator({ execute: (_value, controls) => new Promise((_resolve, reject) => controls.registerCancel(() => { cancelled += 1; reject(new Error('cancelled')) })), cleanupCancelled: async () => { cleaned += 1 }, onChange: (jobs) => { latest = jobs } })
  queue.enqueue([job('a')]); await until(() => latest[0]?.queueState === 'running'); await queue.cancel('a'); await until(() => cleaned === 1)
  assert.equal(cancelled, 1); assert.equal(latest[0].queueState, 'cancelled')
})

test('5 one failed job does not cancel its neighbors', async () => {
  let latest = []
  const queue = new UploadCoordinator({ execute: async (value) => { if (value.jobId === 'b') throw new Error('boom'); return value }, onChange: (jobs) => { latest = jobs } })
  queue.enqueue([job('a'), job('b'), job('c')]); await until(() => latest.every((value) => ['completed', 'failed'].includes(value.queueState)))
  assert.deepEqual(latest.map((value) => value.queueState), ['completed', 'failed', 'completed'])
})

test('6 retry runs only the selected failed job', async () => {
  let latest = []; const counts = { a: 0, b: 0 }
  const queue = new UploadCoordinator({ execute: async (value) => { counts[value.jobId] += 1; if (value.jobId === 'a' && counts.a === 1) throw new Error('once'); return value }, onChange: (jobs) => { latest = jobs } })
  queue.enqueue([job('a'), job('b')]); await until(() => latest.every((value) => ['completed', 'failed'].includes(value.queueState))); await queue.retry('a'); await until(() => latest.every((value) => value.queueState === 'completed'))
  assert.deepEqual(counts, { a: 2, b: 1 })
})

test('7 completed media is never re-uploaded', async () => {
  let calls = 0
  const queue = new UploadCoordinator({ execute: async (value) => { calls += 1; return value }, onChange: () => {} })
  queue.restore([job('done', 'completed')]); await queue.retry('done'); await tick(); assert.equal(calls, 0)
})

test('8 restart recovery preserves job identity', async () => {
  let seen
  const queue = new UploadCoordinator({ execute: async (value) => { seen = value.jobId; return value }, onChange: () => {} })
  queue.restore([{ ...job('stable-id', 'running'), remoteArtifactId: 'remote-id' }]); await until(() => seen === 'stable-id')
  assert.equal(queue.snapshot()[0].remoteArtifactId, 'remote-id')
})

test('9 duplicate enqueue of one job executes once', async () => {
  let calls = 0; let latest = []
  const queue = new UploadCoordinator({ execute: async (value) => { calls += 1; return value }, onChange: (jobs) => { latest = jobs } })
  const same = job('same'); queue.enqueue([same]); queue.enqueue([same]); await until(() => latest[0]?.queueState === 'completed')
  assert.equal(calls, 1); assert.equal(latest.length, 1)
})
