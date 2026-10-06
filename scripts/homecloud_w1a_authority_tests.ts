/**
 * HomeCloud W1-A — authority / capabilities / household invalidation tests.
 *
 * W1-A did not create capabilities and did not touch the backend: household,
 * membership, role and permissions stay server-resolved. These tests prove the
 * CLIENT contracts that were actually broken:
 *
 *  A. Capabilities cache  — two equivalent loads of the same scope produce ONE
 *                           request, and two scopes never share one key.
 *  B. Files data ≠ capabilities — a capabilities failure cannot reach the Files
 *                           read path, and a successful read stays visible
 *                           while mutations are deny-safe.
 *  C. Stable identity     — a capabilities refetch with the same values keeps the
 *                           SAME descriptor object, so the intake `useMemo` does
 *                           not rebuild the service and the accepted-job binding
 *                           survives.
 *  D. Household switch    — switching households invalidates the previous
 *                           household's read cache, its capabilities projection
 *                           and its signed preview urls.
 *  E. Permission mapping  — 403/homecloud_forbidden is an access problem;
 *                           network/5xx is a recoverable load problem; only a real
 *                           empty list is "empty".
 *  F. Security regression — no HomeCloud request sends householdId, bucket or a
 *                           storage path as client authority.
 *
 * No emulator and no mocks of HomeCloud behaviour: the real services run against
 * a stubbed transport.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  fetchHomeCloudCapabilitiesCached,
  type HomeCloudCapabilitiesProjection,
} from '../front/mi-front-limpio/services/homecloudCapabilities';
import {
  DENY_ALL_HOME_CLOUD_CAPABILITIES,
  evaluateHomeCloudCapabilities,
  evaluateStableHomeCloudCapabilities,
  __resetHomeCloudCapabilityDescriptorMemoForTests,
} from '../front/mi-front-limpio/services/homecloud/homecloudCapabilitiesAdapter';
import { homeCloudCapabilitiesNotice } from '../front/mi-front-limpio/services/homecloud/homecloudCapabilitiesNotice';
import {
  classifyHomeCloudReadFailure,
  homeCloudReadFailureDescription,
  homeCloudReadFailureTitle,
  isHomeCloudPermissionError,
} from '../front/mi-front-limpio/services/homecloud/homecloudReadFailure';
import { invalidateHomeCloudScope, previousHomeCloudScopeToInvalidate } from '../front/mi-front-limpio/services/homecloud/homecloudScopeInvalidation';
import {
  fetchHomeCloudFoldersCached,
  invalidateHomeCloudHousehold,
} from '../front/mi-front-limpio/services/homecloud/homecloudReadService';
import {
  clearMemoryPreviewCache,
  getMemoryPreviewUrl,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryPreview';
import { fetchFilesBrowser } from '../front/mi-front-limpio/services/homecloud/homecloudFilesService';
import { createFileIntakeService } from '../front/mi-front-limpio/services/homecloud/homecloudFileIntakeService';
import { createMemoryIntakeService } from '../front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService';
import { plannerCache } from '../front/mi-front-limpio/services/planner/plannerCache';
import { ApiError } from '../front/mi-front-limpio/services/api';
import {
  createAsyncStorageUploadJobStore,
  __setSharedUploadJobStoreForTests,
} from '../front/mi-front-limpio/storage/homecloudUploadJobStorage';
import { __resetSharedUploadQueueForTests } from '../front/mi-front-limpio/services/homecloud/homecloudUploadQueue';

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
  } else {
    failCount += 1;
    console.error(`  FAIL: ${message}`);
  }
}

// ── transport stub ──────────────────────────────────────────────────────────

interface Route {
  status: number;
  body: unknown;
}

class Transport {
  readonly calls: string[] = [];
  private readonly routes: [string, Route][] = [];
  private readonly hang: string[] = [];
  private fallback: Route = { status: 500, body: { code: 'server_error', message: 'boom' } };

  on(match: string, route: Route): this {
    this.routes.unshift([match, route]);
    return this;
  }

  hangOn(match: string): this {
    this.hang.push(match);
    return this;
  }

  countOf(match: string): number {
    return this.calls.filter((call) => call.includes(match)).length;
  }

  install(): void {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (input: unknown) => {
      const target = String(input);
      this.calls.push(target);
      for (const held of this.hang) {
        if (target.includes(held)) return new Promise<Response>(() => {});
      }
      for (const [match, route] of this.routes) {
        if (target.includes(match)) return json(route.status, route.body);
      }
      return json(this.fallback.status, this.fallback.body);
    }) as typeof fetch;
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const CAPS_FULL: HomeCloudCapabilitiesProjection = {
  'homecloud.view': true,
  'homecloud.contribute': true,
  'homecloud.organize': true,
  'homecloud.delete': true,
};

/** A brand new object with the SAME values: exactly what a refetch resolves. */
function sameCapsAgain(): HomeCloudCapabilitiesProjection {
  return { ...CAPS_FULL };
}

function resetCaches(): void {
  plannerCache.__testOnly_clearAll();
  clearMemoryPreviewCache();
  __resetHomeCloudCapabilityDescriptorMemoForTests();
}

function fakeAsyncStorage() {
  const data = new Map<string, string>();
  return {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => { data.set(key, value); },
    removeItem: async (key: string) => { data.delete(key); },
    getAllKeys: async () => [...data.keys()],
  };
}

const SCOPE_A = { accountId: 'acc-1', householdId: 'hh-a', membershipId: 'mb-a' };
const SCOPE_B = { accountId: 'acc-1', householdId: 'hh-b', membershipId: 'mb-b' };

function fileArtifact(name: string) {
  return {
    localUri: `file:///w1a/${name}.pdf`,
    displayName: `${name}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    extension: 'pdf',
  };
}

// ── A. capabilities canonical cache ─────────────────────────────────────────

async function testCapabilitiesCache(): Promise<void> {
  console.log('\n=== W1-A A: capabilities canonical cache ===');
  resetCaches();
  const transport = new Transport();
  transport.on('/api/homecloud/capabilities', {
    status: 200,
    body: { capabilities: CAPS_FULL, membershipId: 'mb-a', householdId: 'hh-a', role: 'coordinator' },
  });
  transport.install();

  // Two equivalent loads of the same scope: exactly what a mount plus a focus
  // re-entry (or a second surface) produces.
  const first = await fetchHomeCloudCapabilitiesCached('tok', SCOPE_A);
  const second = await fetchHomeCloudCapabilitiesCached('tok', SCOPE_A);
  record(transport.countOf('/api/homecloud/capabilities') === 1,
    'A1. two equivalent loads of the same scope issue ONE request');
  record(first['homecloud.contribute'] === true && second['homecloud.contribute'] === true,
    'A2. both loads resolve the granted projection');

  // A different household is a different cache key and must never be shared.
  await fetchHomeCloudCapabilitiesCached('tok', SCOPE_B);
  record(transport.countOf('/api/homecloud/capabilities') === 2,
    'A3. a second household issues its own request (no key collision)');

  // Dropping the household must force a real revalidation, not a fresh-cache hit.
  invalidateHomeCloudScope('hh-a');
  record(freshEntriesOf('hh-a').length === 0,
    'A4. the scope invalidation drops the capabilities key of that household');
  await fetchHomeCloudCapabilitiesCached('tok', SCOPE_A);
  record(transport.countOf('/api/homecloud/capabilities') === 3,
    'A5. after invalidation the projection is really re-requested');
}

/**
 * Freshness of the capabilities projection.
 *
 * The audit question was whether `fetchHomeCloudCapabilitiesCached` can leave
 * capabilities stale indefinitely while the app stays open. The infrastructure
 * has a TTL (`plannerCache` `staleConfig.capabilities`) and external
 * invalidation (household switch + explicit `revalidate`), and the TTL IS
 * enforced on every call — but a TTL nobody re-checks is unenforceable, so the
 * canonical hook re-checks on FOCUS (never on search/sort/render).
 */
async function testCapabilitiesFreshness(): Promise<void> {
  console.log('\n=== W1-A A2: capabilities freshness (TTL + focus re-check) ===');
  resetCaches();
  const transport = new Transport();
  transport.on('/api/homecloud/capabilities', {
    status: 200,
    body: { capabilities: CAPS_FULL, membershipId: 'mb-a', householdId: 'hh-a', role: 'coordinator' },
  });
  transport.install();

  const ttl = plannerCache.getStaleConfig().capabilities;
  record(typeof ttl === 'number' && ttl > 0,
    'A2.1. the capabilities key has a real TTL (it is not cached forever)');
  const previousTtl = ttl;

  // While the entry is fresh, a re-check costs NOTHING: this is what makes a
  // focus re-check safe (it is not a fetch per focus).
  await fetchHomeCloudCapabilitiesCached('tok', SCOPE_A);
  await fetchHomeCloudCapabilitiesCached('tok', SCOPE_A);
  record(transport.countOf('/api/homecloud/capabilities') === 1,
    'A2.2. a re-check inside the TTL issues no additional request');

  // Once the TTL lapses, the very same call really revalidates. The TTL is only
  // a promise if something re-checks — see A2.4/A2.5 for that something.
  // The entry must be written UNDER the lapsed TTL, because the stale config
  // only applies to the entry a call writes; it never rewrites a live one.
  const before = transport.countOf('/api/homecloud/capabilities');
  plannerCache.setStaleConfig({ capabilities: 0 });
  try {
    resetCaches();
    await fetchHomeCloudCapabilitiesCached('tok', SCOPE_A);
    await fetchHomeCloudCapabilitiesCached('tok', SCOPE_A);
    record(transport.countOf('/api/homecloud/capabilities') === before + 2,
      'A2.3. a lapsed TTL is really re-requested instead of being served');
  } finally {
    plannerCache.setStaleConfig({ capabilities: previousTtl });
  }

  const hook = readFront('services/homecloud/useHomeCloudCapabilities.ts');
  const depsOf = (name: string) => {
    const at = hook.indexOf(`}, [${name}`);
    return at === -1 ? null : hook.slice(at, hook.indexOf(');', at));
  };
  record(hook.includes('useFocusEffect'), 'A2.4. the canonical hook re-checks on FOCUS');
  const focusDeps = depsOf('token, scope, revision');
  record(focusDeps !== null && focusDeps.includes('focusRevision'),
    'A2.5. a focus re-entry re-runs the capabilities read');
  const forbidden = ['query', 'sort', 'folder', 'files', 'load(', 'render'];
  record(forbidden.every((needle) => !focusDeps!.includes(needle)),
    'A2.6. the read is never re-run by search/sort/folder/load/render');
  record(!hook.includes('setInterval') && !/setTimeout\([^)]*ttl/i.test(hook),
    'A2.7. no timer or interval drives capabilities freshness');
}

// ── E. permission mapping ───────────────────────────────────────────────────

function testPermissionMapping(): void {
  console.log('\n=== W1-A E: permission vs network vs empty ===');

  const forbidden = new ApiError('No tenés permiso para ver contenido en HomeCloud.', 403, 'homecloud_forbidden');
  record(isHomeCloudPermissionError(forbidden), 'E1. 403 homecloud_forbidden is a permission failure');
  record(classifyHomeCloudReadFailure(forbidden) === 'permission', 'E2. 403 maps to the permission presentation');
  record(classifyHomeCloudReadFailure(new ApiError('Sesión no válida.', 401, 'unauthorized')) === 'permission',
    'E3. 401 is an access problem too, not a load problem');
  record(classifyHomeCloudReadFailure(new ApiError('Se nos cayó la conexión.', 0, 'network_error')) === 'unavailable',
    'E4. a transport failure maps to the retryable load presentation');
  record(classifyHomeCloudReadFailure(new TypeError('Network request failed')) === 'unavailable',
    'E5. a raw fetch TypeError maps to the retryable load presentation');
  record(classifyHomeCloudReadFailure(new ApiError('Se nos cayó la conexión.', 503, 'service_unavailable')) === 'unavailable',
    'E6. 503 maps to the retryable load presentation');
  record(classifyHomeCloudReadFailure(new Error('algo raro')) === 'unavailable',
    'E7. an unrecognised failure is recoverable, never a silent empty');
  record(homeCloudReadFailureTitle('permission', 'tus archivos') !== homeCloudReadFailureTitle('unavailable', 'tus archivos'),
    'E8. a refusal and a load failure never share the same title');
  record(homeCloudReadFailureDescription('permission').includes('membresía')
    && homeCloudReadFailureDescription('unavailable').includes('conexión'),
    'E9. each presentation names its own honest next step');
  record(isHomeCloudPermissionError({ code: 'homecloud_forbidden' }),
    'E10. a typed domain code alone is enough, with no status at all');

  const screen = readFront('screens/HomeCloudFilesScreen.tsx');
  // STAGE 2 REOPEN. This asserted `screen.includes('items.length === 0')`, i.e. that the
  // empty state was a sibling branch that REPLACED the list — which is precisely the
  // defect: replacing the list unmounted the FlatList and with it the RefreshControl, so
  // an empty folder or an empty Favoritos result could not be refreshed at all.
  //
  // The truth is now the opposite and the assertion follows it: the empty state lives
  // INSIDE the list, the list is mounted for every non-fatal outcome, and only a real
  // read refusal or failure still replaces the browser.
  record(screen.includes('ListEmptyComponent=')
    && screen.includes('<FlatList'),
    'E11. the empty state lives INSIDE the list, so the scroll surface always exists');
  record(!/:\s*items\.length === 0 \?/.test(screen),
    'E11a. and there is no branch any more that swaps the list out for an empty view');
  record(screen.includes('readFailure ?') && screen.includes('error ?'),
    'E11b. while a read refusal or a read failure still replaces the browser, as it must');
  record(screen.includes('refreshControl={<RefreshControl') && screen.includes('ListEmptyComponent'),
    'E11c. and the RefreshControl therefore exists on an empty result too');
}

// ── C. stable identity ──────────────────────────────────────────────────────

function testStableIdentity(): void {
  console.log('\n=== W1-A C: stable capabilities identity ===');
  __resetHomeCloudCapabilityDescriptorMemoForTests();

  const first = evaluateStableHomeCloudCapabilities(CAPS_FULL);
  const afterRefetch = evaluateStableHomeCloudCapabilities(sameCapsAgain());
  record(Object.is(first, afterRefetch),
    'C1. a refetch with the same values returns the SAME descriptor object');
  record(!Object.is(evaluateHomeCloudCapabilities(CAPS_FULL), evaluateHomeCloudCapabilities(sameCapsAgain())),
    'C2. the canonical pure evaluation is what used to change identity (the audited gap)');

  const demotedProjection: HomeCloudCapabilitiesProjection = { ...CAPS_FULL, 'homecloud.organize': false };
  const demoted = evaluateStableHomeCloudCapabilities(demotedProjection);
  record(demoted !== first && demoted.organize === false && demoted.contribute === true,
    'C3. a real change of effective values still produces a new descriptor');
  record(evaluateStableHomeCloudCapabilities(demotedProjection) === demoted, 'C4. and it is then memoised');

  record(Object.is(evaluateStableHomeCloudCapabilities(null), DENY_ALL_HOME_CLOUD_CAPABILITIES),
    'C5. an unresolved projection hands out the shared DENY-ALL descriptor');
  record(Object.is(evaluateStableHomeCloudCapabilities(undefined), DENY_ALL_HOME_CLOUD_CAPABILITIES),
    'C6. the same DENY-ALL object is reused across failures (never a new identity)');

  record(homeCloudCapabilitiesNotice({ status: 'denied', failure: 'permission', message: 'x' }) !== null,
    'C7. the deny-safe fallback is NOT silent');
  record(homeCloudCapabilitiesNotice({ status: 'unresolved', failure: null, message: null }) === null,
    'C8. an unresolved scope reports nothing (nothing has failed yet)');
  record(homeCloudCapabilitiesNotice({ status: 'ready', failure: null, message: null }) === null,
    'C9. a resolved projection reports nothing');
}

async function testAcceptedBindingSurvives(): Promise<void> {
  console.log('\n=== W1-A C: accepted job binding survives capabilities revalidation ===');
  const transport = new Transport();
  transport.hangOn('/api/homecloud/register');
  transport.install();
  __setSharedUploadJobStoreForTests(createAsyncStorageUploadJobStore(fakeAsyncStorage()));
  __resetSharedUploadQueueForTests();

  const buildFileService = (capabilities: ReturnType<typeof evaluateStableHomeCloudCapabilities>) =>
    createFileIntakeService(
      { householdId: 'hh-a', accessToken: 'tok', capabilities, getAccessToken: () => 'tok', intakeSource: 'files:w1a' },
      { pickFile: async () => ({ success: true, artifact: fileArtifact('w1a') }), copyToDurableWorkspace: async (artifact) => artifact },
    );

  const stableDescriptor = evaluateStableHomeCloudCapabilities(CAPS_FULL);
  const fileService = buildFileService(stableDescriptor);
  await fileService.pickFile();
  const acceptedJobId = fileService.getAcceptedJobId();
  record(acceptedJobId !== null, 'C10. the File intake service accepted a durable job');

  // Exactly what a capabilities refetch does to the intake `useMemo`: rebuild the
  // service only when the descriptor identity changed.
  const revalidatedDescriptor = evaluateStableHomeCloudCapabilities(sameCapsAgain());
  const afterRefetch = Object.is(revalidatedDescriptor, stableDescriptor)
    ? fileService
    : buildFileService(revalidatedDescriptor);
  record(afterRefetch === fileService, 'C11. a same-value refetch does NOT recreate the File intake service');
  record(afterRefetch.getAcceptedJobId() === acceptedJobId,
    'C12. the accepted job binding survives the capabilities revalidation');

  // Contrast: the pre-W1-A identity really did drop the binding, so C11/C12 are
  // a fix and not an accident of the harness.
  const recreated = buildFileService(evaluateHomeCloudCapabilities(sameCapsAgain()));
  record(recreated !== fileService && recreated.getAcceptedJobId() === null,
    'C13. a recreated service really would have lost the accepted binding');

  // MemoryIntake shares the problem: its service memo also depends on the
  // descriptor, and rebuilding it drops the loaded presentation state.
  transport.on('/api/homecloud/albums', { status: 200, body: { albums: [{ id: 'al-1', name: 'Vacaciones' }] } });
  const memoryDescriptor = evaluateStableHomeCloudCapabilities(CAPS_FULL);
  const memoryService = createMemoryIntakeService({
    householdId: 'hh-a', accessToken: 'tok', capabilities: memoryDescriptor, getAccessToken: () => 'tok', intakeSource: 'memories:w1a',
  });
  await memoryService.loadAlbums();
  record(memoryService.getAvailableDestinations().length > 0,
    'C14. the Memory intake service loaded its destinations');
  const memoryRebuilt = Object.is(evaluateStableHomeCloudCapabilities(sameCapsAgain()), memoryDescriptor)
    ? memoryService
    : createMemoryIntakeService({
      householdId: 'hh-a', accessToken: 'tok', capabilities: evaluateStableHomeCloudCapabilities(sameCapsAgain()), getAccessToken: () => 'tok', intakeSource: 'memories:w1a',
    });
  record(memoryRebuilt === memoryService && memoryRebuilt.getAvailableDestinations().length > 0,
    'C15. MemoryIntake is not rebuilt by a same-value capabilities revalidation either');

  __setSharedUploadJobStoreForTests(null);
  __resetSharedUploadQueueForTests();
}

// ── D. household switch invalidation ────────────────────────────────────────

async function testHouseholdSwitch(): Promise<void> {
  console.log('\n=== W1-A D: household switch invalidation ===');
  resetCaches();
  const transport = new Transport();
  transport.on('/api/homecloud/capabilities', {
    status: 200,
    body: { capabilities: CAPS_FULL, membershipId: 'mb', householdId: 'hh', role: 'coordinator' },
  });
  transport.on('/api/homecloud/folders', {
    status: 200,
    body: { folders: [{ id: 'f-a', name: 'Docs', householdId: 'hh-a' }] },
  });
  transport.on('/access', {
    status: 200,
    body: { signedUrl: 'https://signed.example/hh-a/preview', expiresIn: 3600, variant: 'preview', contentId: 'content-a' },
  });
  transport.install();

  await fetchHomeCloudFoldersCached('tok', { householdId: 'hh-a' });
  await fetchHomeCloudCapabilitiesCached('tok', SCOPE_A);
  await getMemoryPreviewUrl('tok', 'content-a');
  const readsBefore = transport.countOf('/api/homecloud/folders');
  const capsBefore = transport.countOf('/api/homecloud/capabilities');
  const previewsBefore = transport.countOf('/access');
  record(readsBefore === 1 && previewsBefore === 1, 'D1. household A read cache and preview cache are populated');

  // Household A -> household B: one real scope change.
  const switched = invalidateHomeCloudScope('hh-a');
  record(switched.previewsCleared === true, 'D2. the signed preview cache is cleared on switch');
  record(switched.plannerScoped >= 1,
    'D3. the capabilities projection of household A is dropped (planner-scoped, not a homecloud/* key)');
  record(freshEntriesOf('hh-a').length === 0,
    'D4. no authoritative cache entry of household A survives the switch');

  await fetchHomeCloudFoldersCached('tok', { householdId: 'hh-a' });
  record(transport.countOf('/api/homecloud/folders') === readsBefore + 1,
    'D5. household A folders are re-read, never served from the previous cache');
  await fetchHomeCloudCapabilitiesCached('tok', SCOPE_A);
  record(transport.countOf('/api/homecloud/capabilities') === capsBefore + 1,
    'D6. household A capabilities are re-read, never reused after the switch');
  await getMemoryPreviewUrl('tok', 'content-a');
  record(transport.countOf('/access') === previewsBefore + 1,
    'D7. the signed preview URL is re-minted, never reused after the switch');

  // Only the household being LEFT is invalidated.
  await fetchHomeCloudFoldersCached('tok', { householdId: 'hh-b' });
  await fetchHomeCloudCapabilitiesCached('tok', SCOPE_B);
  invalidateHomeCloudScope('hh-a');
  record(freshEntriesOf('hh-b').length >= 2,
    'D8. invalidating A never touches the household B cache');
  record(invalidateHomeCloudHousehold({ householdId: 'hh-a' }) > 0,
    'D9. the read-cache helper reports exactly what it dropped');

  const noScope = invalidateHomeCloudScope(null);
  record(noScope.reads === 0 && noScope.plannerScoped === 0 && noScope.previewsCleared === false,
    'D10. no previous household means nothing to invalidate (no invented scope)');

  // The ONCE-per-real-change contract, proved as behaviour rather than asserted
  // about an effect.
  record(previousHomeCloudScopeToInvalidate(null, 'hh-a') === null,
    'D11. the first scope resolution is not a switch');
  record(previousHomeCloudScopeToInvalidate('hh-a', 'hh-a') === null,
    'D12. a re-render / re-mount of the same household invalidates nothing');
  record(previousHomeCloudScopeToInvalidate('hh-a', 'hh-b') === 'hh-a',
    'D13. a real switch invalidates exactly the household being left');
  record(previousHomeCloudScopeToInvalidate('hh-a', null) === 'hh-a',
    'D14. sign-out invalidates the household it leaves');

  // One owner, mounted once: a second owner would invalidate per mounted surface.
  const navigator = readFront('navigation/AppNavigator.tsx');
  record(countOccurrences(navigator, '<HomeCloudScopeOwner>') === 1,
    'D15. the scope owner is mounted exactly once in the private shell');
  record(!readFront('screens/HomeCloudFilesScreen.tsx').includes('HomeCloudScopeOwner')
    && !readFront('screens/HomeCloudMemoriesScreen.tsx').includes('HomeCloudScopeOwner'),
    'D16. no HomeCloud screen mounts a second scope owner');
  const owner = readFront('components/homecloud/HomeCloudScopeOwner.tsx');
  record(/useEffect\(\(\) => \{[\s\S]*\}, \[householdId\]\);/.test(owner),
    'D17. the owner effect depends only on the household, never on a render cycle');
}

// ── B. Files data independence from capabilities ────────────────────────────

async function testFilesDataIndependence(): Promise<void> {
  console.log('\n=== W1-A B: Files data ≠ capabilities ===');
  resetCaches();
  const transport = new Transport();
  // The Files read answers fine; capabilities is refused by the server.
  transport.on('/api/homecloud/files', {
    status: 200,
    body: {
      browser: {
        folders: [{ id: 'f-1', name: 'Docs', householdId: 'hh-a' }],
        files: [{ id: 'c-1', displayName: 'a.pdf' }],
        nextOffset: null,
      },
    },
  });
  transport.on('/api/homecloud/capabilities', {
    status: 403,
    body: { code: 'homecloud_forbidden', message: 'No tenés permiso para ver contenido en HomeCloud.' },
  });
  transport.install();

  const data = await fetchFilesBrowser('tok', {});
  record(data.browser.files.length === 1 && data.browser.folders.length === 1,
    'B1. the Files read succeeds on its own');

  const refused = await fetchHomeCloudCapabilitiesCached('tok', SCOPE_A).then(() => null, (error: unknown) => error);
  record(refused instanceof ApiError && classifyHomeCloudReadFailure(refused) === 'permission',
    'B2. the capabilities failure is classified on its OWN channel, not as a Files failure');

  record(DENY_ALL_HOME_CLOUD_CAPABILITIES.contribute === false
    && DENY_ALL_HOME_CLOUD_CAPABILITIES.organize === false
    && DENY_ALL_HOME_CLOUD_CAPABILITIES.delete === false,
    'B3. mutations stay deny-safe while capabilities are refused');
  record(homeCloudCapabilitiesNotice({
    status: 'denied',
    failure: 'permission',
    message: homeCloudReadFailureDescription('permission'),
  }) !== null,
    'B4. the refusal is visible instead of masquerading as "no actions"');

  // The Files surface must not be able to re-request capabilities per load or per
  // keystroke, and must not couple them into one promise.
  const screen = readFront('screens/HomeCloudFilesScreen.tsx');
  record(!screen.includes('fetchHomeCloudCapabilities'), 'B5. Files no longer calls the uncached capabilities fetch');
  record(!screen.includes('Promise.all'), 'B6. Files data and capabilities are not loaded in one promise');
  record(screen.includes('useHomeCloudCapabilities'), 'B7. Files reads capabilities through the canonical cached hook');
  record(screen.includes('classifyHomeCloudReadFailure'), 'B8. the Files read failure is classified');
  record(!screen.includes('setCaps'), 'B9. Files keeps no mutable capabilities state to churn on every load');
  const memories = readFront('screens/HomeCloudMemoriesScreen.tsx');
  record(!memories.includes('fetchHomeCloudCapabilities') && memories.includes('useHomeCloudCapabilities'),
    'B10. Memories reads capabilities through the same canonical hook');
  record(!memories.includes('setCapabilities'), 'B11. Memories keeps no mutable capabilities state either');
}

// ── F. security regression: no client authority ────────────────────────────

function testNoClientAuthority(): void {
  console.log('\n=== W1-A F: no client-side authority in HomeCloud requests ===');

  const serviceFiles = [
    'services/homecloud/homecloudFilesService.ts',
    'services/homecloud/homecloudReadService.ts',
    'services/homecloud/homecloudMemoryPreview.ts',
    'services/homecloud/homecloudWrittenMemoryService.ts',
    'services/homecloudCapabilities.ts',
  ];

  // The household is resolved server-side from the token, so a request that also
  // names it (or a bucket, or a storage path) would be client authority.
  const forbidden = /household_id|householdId\s*:|bucket\s*:|storage_path|storagePath\s*:|(^|[^.\w])path\s*:/i;
  let checked = 0;
  for (const file of serviceFiles) {
    for (const call of requestCallsOf(stripComments(readFront(file)))) {
      checked += 1;
      record(!forbidden.test(call), `F. ${file} sends no household/bucket/path authority`);
    }
  }
  record(checked >= 12, `F. the scan actually inspected the HomeCloud request calls (${checked})`);

  const capabilitiesSource = stripComments(readFront('services/homecloudCapabilities.ts'));
  record(/requestJson<[^>]*>\(\s*'\/api\/homecloud\/capabilities',\s*\{\s*accessToken\s*[,}]/.test(capabilitiesSource),
    'F. the canonical capabilities request carries the token only');
  record(!capabilitiesSource.includes('householdId, bucket') && !capabilitiesSource.includes('bucket'),
    'F. the capabilities module never mentions a bucket');

  const filesSource = stripComments(readFront('services/homecloud/homecloudFilesService.ts'));
  record(!filesSource.toLowerCase().includes('household'), 'F. the Files service never names a household at all');
  record(!/original_storage_path|preview_storage_path|homecloud-originals|homecloud-previews/.test(filesSource),
    'F. the Files service never sends a storage path');

  const accessSource = stripComments(readFront('services/homecloud/homecloudReadService.ts'));
  record(accessSource.includes('variant') && !accessSource.includes('bucket'),
    'F. private access asks for a variant, never a bucket or a path');
}

// ── helpers ────────────────────────────────────────────────────────────────

function readFront(relative: string): string {
  const root = path.join(__dirname, '..', '..', '..', 'front', 'mi-front-limpio');
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

/** A cache entry that would still be served as authoritative. */
function freshEntriesOf(householdId: string) {
  return plannerCache.dump().filter((entry) => (
    entry.status === 'fresh'
    && (String(entry.key[3]) === householdId || String(entry.key[2]) === householdId)
  ));
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

/** The argument list of each `requestJson(...)` call, one string per call. */
function requestCallsOf(source: string): string[] {
  const calls: string[] = [];
  const marker = /requestJson</g;
  let match = marker.exec(source);
  while (match !== null) {
    const open = source.indexOf('(', match.index);
    let depth = 0;
    let end = open;
    for (let index = open; index < source.length; index += 1) {
      if (source[index] === '(') depth += 1;
      else if (source[index] === ')') {
        depth -= 1;
        if (depth === 0) { end = index; break; }
      }
    }
    calls.push(source.slice(open, end + 1));
    marker.lastIndex = end + 1;
    match = marker.exec(source);
  }
  return calls;
}

async function main(): Promise<void> {
  console.log('=== HOMECLOUD W1-A AUTHORITY / CAPABILITIES / INVALIDATION TESTS ===');
  await testCapabilitiesCache();
  await testCapabilitiesFreshness();
  testPermissionMapping();
  testStableIdentity();
  await testAcceptedBindingSurvives();
  await testHouseholdSwitch();
  await testFilesDataIndependence();
  testNoClientAuthority();

  console.log(`\nHOMECLOUD_W1A_AUTHORITY_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('HOMECLOUD_W1A_AUTHORITY_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('HOMECLOUD_W1A_AUTHORITY_TESTS=PASS');
  }
}

void main();