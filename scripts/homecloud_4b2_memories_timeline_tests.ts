/**
 * HomeCloud STAGE 4B.2 — Memories Root + Timeline UI focal tests (compiled).
 *
 * Covers the pure Timeline primitive, the card text contract, the ephemeral
 * preview cache, static root/navigation/text-regression guards and the sharp
 * hardening. No mocks of Memories, no fixtures, no storage paths.
 *
 * Run via `node scripts/compiled/scripts/homecloud_4b2_memories_timeline_tests.js`
 * with NODE_PATH=tests/stubs and EXPO_PUBLIC_API_URL set.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import {
  chunkTimelineSectionItems,
  flattenTimelineForSectionList,
  formatTimelineMonthTitle,
  formatTimelineYearOnlyTitle,
  groupMemoriesForTimeline,
  memoryPrimaryText,
  memorySemanticLabel,
  TIMELINE_UNKNOWN_TITLE,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoriesTimeline';
import {
  clearMemoryPreviewCache,
  getMemoryPreviewUrl,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryPreview';
import type { HomeCloudMemoryListItem } from '../front/mi-front-limpio/services/homecloud/homecloudTypes';

let passCount = 0;
let failCount = 0;

// `services/api.ts` reads the React Native `__DEV__` global. Define it for
// the Node runtime before any preview call executes.
(globalThis as { __DEV__?: boolean }).__DEV__ = false;

function record(ok: boolean, message: string) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
  } else {
    failCount += 1;
    console.error(`  FAIL: ${message}`);
  }
}

function expectThrow(fn: () => void, message: string) {
  try {
    fn();
    record(false, `${message} (did not throw)`);
  } catch {
    record(true, message);
  }
}

// --- Memory builders (synthetic DTOs shaped like the 4B.1 read model) ---

let seq = 0;
function mem(overrides: Partial<HomeCloudMemoryListItem> & { id?: string }): HomeCloudMemoryListItem {
  seq += 1;
  return {
    id: overrides.id ?? `4b2-test-${seq}`,
    role: 'memory',
    kind: 'image',
    displayName: 'photo.jpg',
    mimeType: 'image/jpeg',
    extension: 'jpg',
    sizeBytes: 10,
    uploadedByMemberId: null,
    uploadedAt: '2024-01-01T00:00:00.000Z',
    hasPreview: false,
    hiddenFromResurfacing: false,
    caption: null,
    writtenText: null,
    capturedAt: null,
    capturedYear: null,
    capturedMonth: null,
    capturePrecision: 'unknown',
    albumIds: [],
    ...overrides,
  } as HomeCloudMemoryListItem;
}

const exactAug2020 = () =>
  mem({
    kind: 'image',
    capturePrecision: 'exact',
    capturedAt: '2020-08-15T12:00:00.000Z',
    capturedYear: 2020,
    capturedMonth: 8,
  });
const monthAug2020 = () =>
  mem({ kind: 'image', capturePrecision: 'month_year', capturedYear: 2020, capturedMonth: 8 });
const year2020 = () =>
  mem({ kind: 'image', capturePrecision: 'year', capturedYear: 2020 });
const unknownMem = () => mem({ kind: 'image', capturePrecision: 'unknown' });

console.log('\n=== HC-4B2 MEMORIES ROOT + TIMELINE TESTS ===\n');

// --- 1-10: TIMELINE GROUPING ---

{
  const groups = groupMemoriesForTimeline([unknownMem(), exactAug2020()]);
  const last = groups[groups.length - 1];
  record(last.year === null && last.sections[0].kind === 'unknown', '1. unknown va al final');
}

{
  const groups = groupMemoriesForTimeline([year2020()]);
  const section = groups[0].sections[0];
  record(
    section.kind === 'year' && section.month === null && section.title === 'Durante 2020',
    '2. year no inventa month (bloque Durante 2020, month null)',
  );
}

{
  const a = monthAug2020();
  const b = monthAug2020();
  const groups = groupMemoriesForTimeline([a, b]);
  record(
    groups.length === 1 && groups[0].sections.length === 1 && groups[0].sections[0].items.length === 2,
    '3. month_year agrupa correctamente (mismo mes, una seccion)',
  );
}

{
  const groups = groupMemoriesForTimeline([exactAug2020(), monthAug2020()]);
  const section = groups[0].sections[0];
  record(
    section.kind === 'month' && section.title === 'Agosto' && section.items.length === 2,
    '4. exact agrupa por month/year junto a month_year (Agosto)',
  );
}

{
  const first = exactAug2020();
  const second = mem({
    kind: 'image',
    capturePrecision: 'exact',
    capturedAt: '2020-08-02T12:00:00.000Z',
    capturedYear: 2020,
    capturedMonth: 8,
  });
  const groups = groupMemoriesForTimeline([first, second]);
  const items = groups[0].sections[0].items;
  record(items[0].id === first.id && items[1].id === second.id, '5. exact preserva orden recibido');
}

{
  const m26 = mem({ kind: 'image', capturePrecision: 'year', capturedYear: 2026 });
  const m25 = mem({ kind: 'image', capturePrecision: 'year', capturedYear: 2025 });
  const groups = groupMemoriesForTimeline([m26, m25]);
  record(
    groups.length === 2 && groups[0].year === 2026 && groups[1].year === 2025,
    '6. multiples anios (un grupo por anio, orden recibido)',
  );
}

{
  const groups = groupMemoriesForTimeline([year2020(), monthAug2020(), exactAug2020()]);
  const kinds = groups[0].sections.map((s) => s.kind);
  record(
    kinds[kinds.length - 1] === 'year' && kinds[0] === 'month',
    '7. year-only despues de month groups del mismo year',
  );
}

{
  const groups = groupMemoriesForTimeline([unknownMem(), unknownMem()]);
  record(
    groups.length === 1 && groups[0].year === null && groups[0].title === TIMELINE_UNKNOWN_TITLE,
    '8. unknown no crea anio ficticio',
  );
}

{
  // uploadedAt says 2024, semantic date says 2020: the group must be 2020.
  const tricky = mem({
    kind: 'image',
    uploadedAt: '2024-05-01T00:00:00.000Z',
    capturePrecision: 'month_year',
    capturedYear: 2020,
    capturedMonth: 8,
  });
  const groups = groupMemoriesForTimeline([tricky]);
  const timelineSource = stripComments(
    fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'front', 'mi-front-limpio', 'services', 'homecloud', 'homecloudMemoriesTimeline.ts'),
      'utf8',
    ),
  );
  record(groups[0].year === 2020, '9a. agrupacion ignora uploadedAt (manda fecha semantica)');
  record(!timelineSource.includes('uploadedAt'), '9b. el primitive nunca lee uploadedAt');
}

{
  const input = [exactAug2020(), monthAug2020(), year2020(), unknownMem()];
  const first = groupMemoriesForTimeline(input);
  const second = groupMemoriesForTimeline(input);
  const keys = (gs: typeof first) => gs.flatMap((g) => [g.key, ...g.sections.map((s) => s.key)]);
  const k1 = keys(first);
  const k2 = keys(second);
  record(
    JSON.stringify(k1) === JSON.stringify(k2) && new Set(k1).size === k1.length,
    '10. stable keys (deterministas y unicas)',
  );
}

// --- Labels ---

record(formatTimelineMonthTitle(8) === 'Agosto', 'label: month 8 es Agosto');
record(formatTimelineYearOnlyTitle(2026) === 'Durante 2026', 'label: year-only es Durante 2026');
record(TIMELINE_UNKNOWN_TITLE === 'Sin fecha', 'label: unknown es Sin fecha');
record(memorySemanticLabel(exactAug2020()) === '15 agosto 2020', 'label: exact muestra dia real');
record(memorySemanticLabel(monthAug2020()) === 'Agosto de 2020', 'label: month_year honesto');
record(memorySemanticLabel(year2020()) === 'Durante 2020', 'label: year honesto');
record(memorySemanticLabel(unknownMem()) === 'Sin fecha', 'label: unknown honesto');

// --- SectionList flattening ---

{
  const groups = groupMemoriesForTimeline([exactAug2020(), monthAug2020(), year2020(), unknownMem()]);
  const flat = flattenTimelineForSectionList(groups, 3);
  record(
    flat.length === 3 && flat[0].yearTitle === '2020' && flat[1].yearTitle === null,
    'flatten: year header solo en la primera seccion del anio',
  );
  const rows = chunkTimelineSectionItems('m:2020-8', [exactAug2020(), monthAug2020(), exactAug2020(), monthAug2020()], 3);
  record(
    rows.length === 2 && rows[0].items.length === 3 && rows[1].items.length === 1 && rows[0].key !== rows[1].key,
    'chunk: filas de hasta 3 cards con keys estables',
  );
}

// --- 11-18: CARD CONTRACT ---

const frontRoot = path.join(__dirname, '..', '..', '..', 'front', 'mi-front-limpio');
function readFront(relative: string): string {
  return fs.readFileSync(path.join(frontRoot, relative), 'utf8');
}
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}
const cardsSource = stripComments(readFront('components/homecloud/MemoryCards.tsx'));
const timelineSourceForCards = stripComments(
  readFront('services/homecloud/homecloudMemoriesTimeline.ts'),
);
const previewSource = stripComments(readFront('services/homecloud/homecloudMemoryPreview.ts'));

record(cardsSource.includes('useMemoryPreviewUrl') && cardsSource.includes('<Image'), '11. image con preview (signed preview bajo demanda)');
record(cardsSource.includes('image-outline') && cardsSource.includes('imageFailed'), '12. image preview unavailable fallback (no rompe Timeline)');
record(!/video[\s\S]{0,400}getMemoryPreviewUrl|preview/i.test(cardsSource.split('MemoryVideoTile')[1]?.split('function ')[0] ?? ''), '13. video sin poster no intenta fabricar preview');
record(cardsSource.includes('videocam') && cardsSource.includes('play'), '13b. video: superficie neutral + play');
record(!cardsSource.toLowerCase().includes('waveform'), '14a. audio no renderiza waveform falsa');
record(cardsSource.includes('musical-notes'), '14b. audio: card propia con icono');
record(
  memoryPrimaryText(mem({ kind: 'written', writtenText: 'hola mundo', displayName: null })) === 'hola mundo',
  '15. written usa writtenText',
);
record(
  memoryPrimaryText(mem({ kind: 'written', writtenText: 'texto', displayName: null, caption: null })) === 'texto',
  '16. written no necesita displayName',
);
record(
  memoryPrimaryText(mem({ kind: 'image', caption: 'playa', displayName: 'IMG_1.jpg' })) === 'playa' &&
    memoryPrimaryText(mem({ kind: 'image', caption: null, displayName: 'IMG_1.jpg' })) === 'IMG_1.jpg',
  '17. binary caption fallback (caption -> displayName)',
);
record(
  memoryPrimaryText(mem({ kind: 'image', caption: null, displayName: null })) === '' &&
    !timelineSourceForCards.includes('mimeType'),
  '18. null-safe rendering (nunca NULL/undefined/MIME)',
);

// --- 19-24: ROOT STATES (static guards over the productive screen) ---

const screenSource = stripComments(readFront('screens/HomeCloudMemoriesScreen.tsx'));
const screenNoStrings = screenSource;
record(screenNoStrings.includes('Skeleton'), '19. loading (skeletons coherentes)');
record(screenSource.includes('Aún no hay recuerdos'), '20. empty (mensaje honesto, sin CTA falso)');
record(screenSource.includes('ErrorState') && screenSource.includes('No pudimos cargar tus recuerdos'), '21. error recuperable');
record(screenSource.includes('Reintentar') && screenSource.includes('loadFirstPage'), '22. retry');
record(screenSource.includes('SectionList') && screenSource.includes('listMemories'), '23. success (read model real)');
record(screenSource.includes('RefreshControl') && screenSource.includes('refreshing'), '24. refresh (pull-to-refresh, sin polling)');

// --- 25-30: NAVIGATION + NO-MOCK GUARDS ---

const filesSource = stripComments(readFront('screens/HomeCloudFilesScreen.tsx'));
const rootSource = stripComments(readFront('screens/HomeCloudScreen.tsx'));
const navTypes = readFront('navigation/types.ts');
const navigator = readFront('navigation/HomeTabNavigator.tsx');
record(filesSource.includes('fetchFilesBrowser'), '25. Files sigue abriendo (comportamiento intacto)');
record(
  navTypes.includes('HomeCloud: undefined') && navigator.includes('HomeCloudScreen') && rootSource.includes('HomeCloudMemoriesView') && screenSource.includes('listMemories'),
  '26. Recuerdos abre vista real dentro de la unica superficie HomeCloud',
);
record(
  rootSource.includes('display: \'none\'') && rootSource.includes('HomeCloudFilesView') &&
    !screenSource.includes("navigate('HomeCloudFiles')") && !filesSource.includes("navigate('HomeCloudMemories')"),
  '27. alternar Files/Recuerdos preserva ambas vistas montadas, sin navegacion ni remount',
);
{
  const noMockPattern = /\b(fixtures?|mocks?|storageId|hardcode\w*)\b/i;
  record(
    !noMockPattern.test(screenSource) && !noMockPattern.test(cardsSource),
    '28. no mocks de memories en superficie productiva',
  );
}
record(!/original_storage_path|preview_storage_path|homecloud-originals|homecloud-previews/.test(screenSource + cardsSource + previewSource), '30. no storage path leak en UI');
record(!screenSource.includes('upload simulation') && !screenSource.includes('MemoryKind'), '29. no fixtures hardcodeadas ni kind persistido');

// --- 31-33: PREVIEW (static + runtime with fetch stub) ---

record(!previewSource.includes('AsyncStorage') && !previewSource.includes('plannerCache'), '31. signed URL no persiste (cache efimera en memoria)');
record(previewSource.includes('preview_unavailable'), '33a. unavailable tipado no rompe card');

async function previewRuntime() {
  let fetchCalls = 0;
  const okBody = {
    signedUrl: 'https://preview.test/signed-123',
    bucket: 'homecloud-previews',
    path: 'hh/content/preview',
    expiresIn: 3600,
    variant: 'preview',
    contentId: 'preview-ok',
  };
  const missingBody = { code: 'preview_unavailable', message: 'sin preview', contentId: 'preview-missing', variant: 'preview' };
  (globalThis as { fetch?: unknown }).fetch = async (url: unknown) => {
    fetchCalls += 1;
    const target = String(url);
    const isMissing = target.includes('preview-missing');
    const status = isMissing ? 404 : 200;
    const body = isMissing ? missingBody : okBody;
    return {
      ok: status === 200,
      status,
      headers: { get: () => null },
      text: async () => JSON.stringify(body),
    };
  };
  clearMemoryPreviewCache();
  const first = await getMemoryPreviewUrl('token-test', 'preview-ok');
  const second = await getMemoryPreviewUrl('token-test', 'preview-ok');
  record(first.status === 'ready' && second.status === 'ready', '32a. preview ready resuelve URL firmada');
  record(fetchCalls === 1, '32b. no duplicate fetch por rerender (cache efimera)');
  const missing = await getMemoryPreviewUrl('token-test', 'preview-missing');
  record(missing.status === 'unavailable', '33b. unavailable runtime no rompe (fallback)');
}

// --- 34: TEXT REGRESSION ---

{
  // Raw visible strings must travel through AppText (or a title/placeholder/
  // accessibility prop), never as direct children of View / Pressable /
  // AppButton. The scanner neutralizes every {...} expression with brace
  // balancing (arrow functions, style objects) and then flags any leftover
  // text node whose parent tag is not AppText.
  const guardees = [
    'screens/HomeCloudMemoriesScreen.tsx',
    'components/homecloud/MemoryCards.tsx',
    'screens/HomeCloudFilesScreen.tsx',
  ];
  const TEXT_PARENTS = new Set(['AppText']);

  function neutralizeExpressions(code: string): string {
    let out = '';
    let i = 0;
    while (i < code.length) {
      const ch = code[i];
      if (ch === '"' || ch === "'" || ch === '`') {
        const quote = ch;
        out += ch;
        i += 1;
        while (i < code.length && code[i] !== quote) {
          if (code[i] === '\\') {
            out += code.slice(i, i + 2);
            i += 2;
          } else {
            out += code[i];
            i += 1;
          }
        }
        if (i < code.length) {
          out += code[i];
          i += 1;
        }
        continue;
      }
      if (ch === '{') {
        let depth = 1;
        i += 1;
        while (i < code.length && depth > 0) {
          const inner = code[i];
          if (inner === '"' || inner === "'" || inner === '`') {
            const quote = inner;
            i += 1;
            while (i < code.length && code[i] !== quote) {
              if (code[i] === '\\') i += 2;
              else i += 1;
            }
            i += 1;
            continue;
          }
          if (inner === '{') depth += 1;
          if (inner === '}') depth -= 1;
          i += 1;
        }
        out += '{S}';
        continue;
      }
      out += ch;
      i += 1;
    }
    return out;
  }

  function scanRawTextViolations(code: string): string[] {
    const flat = neutralizeExpressions(stripComments(code));
    const violations: string[] = [];
    const tagStack: string[] = [];
    const textPattern = /(<!--[\s\S]*?-->)|(<\/?[A-Za-z][^<>]*\/?>)|([^<>]+)/g;
    let match: RegExpExecArray | null;
    while ((match = textPattern.exec(flat)) !== null) {
      const [, , tag, text] = match;
      if (tag) {
        const closing = tag.startsWith('</');
        const selfClosing = tag.endsWith('/>');
        const name = tag.replace(/^<\/?/, '').split(/[\s/>]/)[0];
        if (closing) {
          tagStack.pop();
        } else if (!selfClosing) {
          tagStack.push(name);
        }
        continue;
      }
      if (text !== undefined && text.trim().length > 0) {
        const parent = tagStack[tagStack.length - 1];
        if (parent && !TEXT_PARENTS.has(parent)) {
          violations.push(`${parent}: ${text.trim().slice(0, 80)}`);
        }
      }
    }
    return violations;
  }

  let violations: string[] = [];
  for (const relative of guardees) {
    const raw = readFront(relative);
    for (const hit of scanRawTextViolations(raw)) violations.push(`${relative}: ${hit}`);
  }
  record(violations.length === 0, `34. no AppButton/View/Pressable con strings crudos (${violations.length} violaciones)`);
  if (violations.length > 0) console.error(violations.join('\n'));
}

// --- SHARP HARDENING ---

{
  const require = createRequire(path.join(__dirname, 'homecloud_4b2_memories_timeline_tests.js'));
  const backendRoot = path.join(__dirname, '..', '..', '..', 'backend');
  const backendPkg = JSON.parse(fs.readFileSync(path.join(backendRoot, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  record(typeof backendPkg.dependencies?.sharp === 'string', `sharp declarado en backend/package.json (${backendPkg.dependencies?.sharp ?? 'ausente'})`);
  try {
    const resolved = require.resolve('sharp', { paths: [backendRoot] });
    record(resolved.includes('homecloud-current'), `sharp resuelve desde el proyecto (${resolved})`);
  } catch {
    record(false, 'sharp resuelve desde el proyecto (require.resolve fallo)');
  }
  expectThrow(() => {
    throw new Error('probe');
  }, 'sharp harness sanity (expectThrow funciona)');
}

void (async () => {
  await previewRuntime();
  console.log(`\nHOMECLOUD_4B2_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('HOMECLOUD_4B2_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('HOMECLOUD_4B2_TESTS=PASS');
  }
})();
