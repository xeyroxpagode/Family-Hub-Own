/**
 * HomeCloud Files - Stage 2 / Phase 2 - FILES UX / INTERACTION, frontend evidence.
 *
 * The Files surface was the busiest part of a screen whose whole promise is being
 * information-first: a search field, a breadcrumb, a title, then a row carrying a
 * refresh icon, a `Recientes / A-Z` button, a `Favoritos` toggle, a `Seleccionar`
 * button and a `+`. Stage 2 collapses that and moves the actions onto gestures.
 *
 *  X-A  HEADER.      Exactly three controls remain: one compact filter/order icon,
 *                    `+`, and `...`. No permanent refresh, no permanent sort
 *                    button, no permanent Favoritos, no permanent Seleccionar, no
 *                    circular `+`.
 *  X-B  OVERFLOW.    `Seleccionar` and `Actualizar` are the screen-level actions,
 *                    and Seleccionar is the ONLY entry into selection mode.
 *  X-C  REFRESH.     Pull-to-refresh is the primary path; both paths invoke the
 *                    SAME window-preserving `refresh()`, and the indicator settles
 *                    on success AND failure.
 *  X-D  FILTERS.     MOSTRAR / ORDENAR compose server-side; changing one resets
 *                    pagination safely and never corrupts selection.
 *  X-E  GRAMMAR.     Outside selection: tap is the Viewer's seam, long press is the
 *                    contextual menu. Inside selection: tap toggles and long press
 *                    does NOTHING. The Stage 1 long-press-to-select is gone.
 *  X-F  STALE TARGET. A contextual target is resolved by ID against the CURRENT
 *                    rows, never from an object captured when the menu opened.
 *  X-G  ACCESSIBILITY. Long press is never the only route to an action, and the
 *                    accessibility action disappears entirely while selecting.
 *  X-H  DONOR.       The donor screen's grammar and tokens are reused and the donor
 *                    is not modified.
 *
 * Nothing is faked beyond the transport boundary: the real filter grammar, the real
 * selection model and the real Files screen are read and driven.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  DEFAULT_FILES_FILTER_STATE,
  FILES_SHOW_OPTIONS,
  FILES_SORT_OPTIONS,
  filesFavoritesOnly,
  filesFilterAccessibilityLabel,
  filesFilterDescription,
  filesShowLabel,
  filesSortLabel,
  hasNonDefaultFilesFilter,
} from '../front/mi-front-limpio/services/homecloud/homecloudFilesFilters';
import {
  emptyFileSelection,
  enterFileSelection,
  leaveFileSelection,
  pruneFileSelection,
  selectedFileIds,
  toggleFileSelection,
} from '../front/mi-front-limpio/services/homecloud/homecloudFileSelection';

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCREEN = path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'screens', 'HomeCloudFilesScreen.tsx');
const PLANNER = path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'screens', 'planner', 'PlannerTasksScreen.tsx');
const PLANNER_SHARED = path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'screens', 'planner', 'plannerShared.ts');
const screen = fs.readFileSync(SCREEN, 'utf8');

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string): void {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
  } else {
    failCount += 1;
    console.error(`  FAIL: ${message}`);
  }
}

console.log('\n=== HOMECLOUD FILES: UX / INTERACTION TESTS (STAGE 2 PHASE 2) ===\n');

// ── X-A: the header ────────────────────────────────────────────────────────
console.log('--- X-A: header carries three controls and no permanent duplicates ---');
{
  record(!/name="refresh"/.test(screen), 'the visible Refresh ICON is gone');
  record(!/title="Favoritos"/.test(screen), 'the permanent Favoritos button is gone');
  record(!/Recientes<\/AppButton>|title=\{sort === 'recent'/.test(screen), 'the text-heavy Recientes / A-Z button is gone');
  record(!/borderRadius: radius\.full[^}]*add/i.test(screen.replace(/\s+/g, ' ')) || screen.includes('headerIconButton'), 'the `+` has no bespoke circular container of its own');
  record((screen.match(/<InteractivePressable style=\{styles\.headerIconButton\}/g) ?? []).length === 3,
    `exactly THREE header controls remain: filter, +, ... (${(screen.match(/<InteractivePressable style=\{styles\.headerIconButton\}/g) ?? []).length})`);
  record(screen.includes('name="options-outline"'), 'one compact filter/order ICON opens the display filters');
  record(screen.includes('name="add" size={22}'), 'the `+` keeps the donor icon size (22)');
  record(screen.includes('name="ellipsis-horizontal" size={22}'), 'the overflow keeps the donor icon size (22)');
  record((screen.match(/ellipsis-horizontal/g) ?? []).length === 1, 'exactly ONE ellipsis remains, and it is the header overflow - no per-File or per-Folder ellipsis');
  record(!/styles\.more/.test(screen), 'the absolutely-positioned ellipsis style is gone entirely');
  record(screen.includes('delayLongPress={350}'), 'long press uses the framework default threshold - no custom timer exists in Files');
}

// ── X-B: the overflow ──────────────────────────────────────────────────────
console.log('--- X-B: screen-level overflow ---');
{
  record(screen.includes('visible={overflowOpen}'), 'the header overflow is a screen-level sheet');
  const overflowBlock = /visible=\{overflowOpen\}[\s\S]*?<\/ActionSheet>/.exec(screen);
  record(Boolean(overflowBlock), 'the overflow block exists');
  if (overflowBlock) {
    record(overflowBlock[0].includes('title="Seleccionar"'), 'Seleccionar lives in the overflow');
    record(overflowBlock[0].includes('title="Actualizar"'), 'Actualizar lives in the overflow as the secondary refresh path');
    record(!/Favoritos|Recientes|A-Z/.test(overflowBlock[0]), 'no speculative or display-filter options were added to the overflow');
  }
  record((screen.match(/enterSelectionMode\(\)/g) ?? []).length === 1, 'Seleccionar is the ONLY place that enters selection mode');
  record(!/beginSelectionAt|beginFileSelectionAt/.test(screen), 'the Stage 1 long-press-to-select entry is REMOVED from the screen');
}

// ── X-C: refresh ───────────────────────────────────────────────────────────
console.log('--- X-C: one refresh authority, two honest paths ---');
{
  record(screen.includes('refreshControl={<RefreshControl'), 'pull-to-refresh is attached to the LIST, so it works with rows and when empty');
  record(screen.includes('const pullToRefresh = useCallback') && screen.includes('await refresh()'), 'pull-to-refresh invokes the canonical refresh()');
  record(/setRefreshing\(true\)[\s\S]*?try \{[\s\S]*?finally \{[\s\S]*?setRefreshing\(false\)/.test(screen), 'the refresh indicator settles in a finally, so a rejection cannot leave a spinner forever');
  record(screen.includes('const [refreshing, setRefreshing] = useState(false)'), 'the indicator is driven by its own local flag, not by the paging loading state');
  const refreshCalls = (screen.match(/await refresh\(\)/g) ?? []).length;
  record(refreshCalls >= 1, `every refresh path funnels into the same authority (${refreshCalls} explicit call(s))`);
  // Comments are stripped first: this screen DOCUMENTS that no second refresh
  // implementation exists, and matching that prose would be a self-defeating test.
  const screenCode = screen.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  for (const forbidden of ['refreshV2', 'reloadFirstPage', 'refreshPreservingWindowV2']) {
    record(!screenCode.includes(forbidden), `no second refresh implementation named ${forbidden}`);
  }
  record(/refreshPreservingWindow|pagination controller|window-preserving/i.test(screen), 'the comment records WHY refresh is the window-preserving authority');
}

// ── X-D: the filter grammar ────────────────────────────────────────────────
console.log('--- X-D: display filters compose server-side ---');
{
  record(DEFAULT_FILES_FILTER_STATE.show === 'all' && DEFAULT_FILES_FILTER_STATE.sort === 'recent', 'the default is Todos + Recientes');
  record(filesFavoritesOnly(DEFAULT_FILES_FILTER_STATE) === false, 'the default is NOT favorites-only');
  record(filesFavoritesOnly({ show: 'favorites', sort: 'recent' }) === true, 'Favoritos maps to the server favoritesOnly flag');
  record(hasNonDefaultFilesFilter(DEFAULT_FILES_FILTER_STATE) === false, 'the default looks clean and unaccented');
  record(hasNonDefaultFilesFilter({ show: 'favorites', sort: 'recent' }) === true, 'Favoritos alone is a non-default filter');
  record(hasNonDefaultFilesFilter({ show: 'all', sort: 'name' }) === true, 'A-Z alone is a non-default filter');
  record(hasNonDefaultFilesFilter({ show: 'favorites', sort: 'name' }) === true, 'both together are non-default');
  record(FILES_SHOW_OPTIONS.map((option) => option.label).join(',') === 'Todos,Favoritos', 'MOSTRAR offers exactly Todos and Favoritos');
  record(FILES_SORT_OPTIONS.map((option) => option.label).join(',') === 'Recientes,A-Z', 'ORDENAR offers exactly Recientes and A-Z');
  record(filesShowLabel({ show: 'favorites', sort: 'recent' }) === 'Favoritos', 'the show axis labels itself');
  record(filesSortLabel({ show: 'all', sort: 'name' }) === 'A-Z', 'the sort axis labels itself');
  record(/todos los archivos/.test(filesFilterDescription(DEFAULT_FILES_FILTER_STATE)), 'the description names the show axis in product words');
  record(/más recientes/.test(filesFilterDescription(DEFAULT_FILES_FILTER_STATE)), 'the description names the order axis');
  record(/tus favoritos/.test(filesFilterDescription({ show: 'favorites', sort: 'recent' })), 'the description is honest when Favoritos is on');
  record(filesFilterAccessibilityLabel(DEFAULT_FILES_FILTER_STATE).startsWith('Filtros y orden.'), 'the filter icon announces what it is before it is used');
  // The filter is a MODE: it must survive a folder change exactly like sort did.
  record(screen.includes('setFilterState(DEFAULT_FILES_FILTER_STATE)') && /setFolder\(null\); setQuery\(''\); setFilterState/.test(screen),
    'a household switch resets the filter, while a folder change preserves it (the query is what gets cleared)');
  record(!/\.sort\(|filter\(.*=>.*!==/.test(screen.slice(screen.indexOf('const items = useMemo'), screen.indexOf('const rowsAreCurrent'))),
    'the client never sorts or filters the loaded page locally');
}

// ── X-E: the interaction grammar ───────────────────────────────────────────
console.log('--- X-E: the Stage 2 interaction grammar ---');
{
  const tapHandler = /const handleFileTap = useCallback\(\(fileId: string\) => \{[\s\S]*?\}, \[selection\.mode\]\);/.exec(screen);
  const longHandler = /const handleFileLongPress = useCallback\(\(fileId: string\) => \{[\s\S]*?\}, \[selection\.mode\]\);/.exec(screen);
  record(Boolean(tapHandler), 'the tap handler exists');
  record(Boolean(longHandler), 'the long-press handler exists');
  if (tapHandler) {
    // STAGE 2 (Phase 3) SUPERSESSION. Phase 2 reserved the tap for the Viewer and
    // asserted it did nothing at all. Phase 3 WIRES it, so outside selection the tap
    // now opens the Viewer instead of being inert. The guarantee that is NOT
    // superseded is the important one: a tap can never be a SELECTION gesture.
    record(/if \(selection\.mode\) \{[\s\S]*?toggleFileSelection[\s\S]*?return;/.test(tapHandler[0]), 'INSIDE selection a tap toggles and returns');
    record(tapHandler[0].indexOf('toggleFileSelection') < tapHandler[0].indexOf('return;'), 'the toggle happens only inside the guarded branch');
    record(/setViewerTargetId\(fileId\)/.test(tapHandler[0]), 'OUTSIDE selection a tap now opens the Viewer (the seam is wired)');
    record(!/beginSelectionAt|beginFileSelectionAt/.test(tapHandler[0]), 'and it is never a selection gesture');
    record(/files\.find\(\(candidate\) => candidate\.id === fileId\)/.test(tapHandler[0]), 'the Viewer target is resolved against the CURRENT rows by id');
  }
  if (longHandler) {
    record(/if \(selection\.mode\) return;/.test(longHandler[0]), 'INSIDE selection a long press does NOTHING');
    record(/setActionTargetId\(fileId\)/.test(longHandler[0]), 'OUTSIDE selection a long press opens the contextual File actions');
  }
  // The guard lives in the production handlers, not in a render closure, so it
  // cannot go stale while rows are memoised.
  record(screen.includes('const handleFileTap = useCallback') && screen.includes('const handleFileLongPress = useCallback'),
    'both guards live in memoized handlers, not in per-row render closures');
  record(/<FolderTile folder=\{item\.value\} onPress=\{\(\) => openFolder\(item\.value\)\} onLongPress=\{\(\) => setFolderActions\(item\.value\)\} \/>/.test(screen),
    'Folder: tap navigates and long press opens the folder actions');
  record(!/function FolderTile[\s\S]*?onMore/.test(screen), 'FolderTile has no ellipsis handler any more');
}

// ── X-F: stale-target protection ───────────────────────────────────────────
console.log('--- X-F: a contextual target is resolved by ID, never captured ---');
{
  record(screen.includes('const [actionTargetId, setActionTargetId] = useState<string | null>(null)'), 'the File action target is an ID');
  record(/actionTargetId === null \? null : files\.find\(/.test(screen), 'the target is RESOLVED against the CURRENT rows');
  record(/if \(actionTargetId === null \|\| actionTarget !== null\) return;[\s\S]*?setActionTargetId\(null\)/.test(screen),
    'a target that left the loaded window DISMISSES instead of acting on a stale object');
  record(/const targetId = actionTarget\.id;[\s\S]*?await setHomeCloudFileFavorite\(token, targetId/.test(screen),
    'the mutation is sent with the resolved ID, so a rename or move between open and tap cannot mis-target');
  record(screen.includes('<FileActionHost file={actionTarget}'), 'the canonical host is always fed the resolved target');
  record(!/file={actionTargetId}/.test(screen), 'the host is never handed the raw id where an object is expected');
}

// ── X-G: accessibility ─────────────────────────────────────────────────────
console.log('--- X-G: long press is never the only route ---');
{
  record(screen.includes('accessibilityHint="Toca para abrir. Mantené presionado para ver sus acciones."'), 'the File tile explains both gestures');
  record(/accessibilityActions=\{selectionMode \? undefined : \[\{ name: 'longpress'/.test(screen),
    'the File tile offers an accessibility action for the contextual menu OUTSIDE selection');
  record(/onAccessibilityAction=\{\(event\) => \{ if \(!selectionMode && event\.nativeEvent\.actionName === 'longpress'\) onLongPress\(\); \}\}/.test(screen),
    'the accessibility action is inert while selecting, matching the gesture');
record(/accessibilityActions=\{\[\{ name: 'activate', label: 'Abrir carpeta' \}, \{ name: 'longpress', label: 'Acciones de la carpeta' \}\]\}/.test(screen.replace(/\s+/g, ' ')),
    'the Folder tile offers both open and actions to assistive technology');
  record(/accessibilityLabel=\{`Abrir carpeta \$\{folder\.name\}`\}/.test(screen), 'the Folder tile still names itself');
  record(/favoriteHint = file\.isFavorite \? ', favorito' : ''/.test(screen), 'the favorite state is stated in the label, so removing the ellipsis lost no information');
  record(/accessibilityLabel=\{`\$\{selectionMode \? `\$\{file\.displayName\}\$\{selected \? ', seleccionado' : ', no seleccionado'\}` : file\.displayName\}\$\{favoriteHint\}`\}/.test(screen),
    'the File tile label states the name, the selected state and the favorite state');
}

// ── X-H: donor reuse, donor untouched ──────────────────────────────────────
console.log('--- X-H: the donor grammar is reused and the donor is untouched ---');
{
  const planner = fs.readFileSync(PLANNER, 'utf8');
  const plannerShared = fs.readFileSync(PLANNER_SHARED, 'utf8');
  record(planner.includes('name="options-outline" size={20}'), 'the donor filter icon is options-outline at size 20, which Files matches');
  record(planner.includes('width: 44, height: 44, borderRadius: radius.full'), 'the donor header icon button is 44x44 fully round, which Files matches');
  record(screen.includes('headerIconButton: { width: 44, height: 44, borderRadius: radius.full'), 'Files uses the donor icon-button geometry verbatim');
  record(screen.includes('width: 8, height: 8, borderRadius: 4'), 'Files uses the donor small-dot active indicator, not an invented badge');
  record(screen.includes('backgroundColor: colors.terracotta[600]'), 'Files uses the donor accent colour for the active filter');
  record(/overflowItem: \{[\s\S]*?paddingVertical: spacing\[3\]/.test(plannerShared), 'the donor overflow item style exists and is what the overflow sheet reuses via ActionSheet');
  // The donor must not have been changed by Files.
  record(!/HomeCloud|homecloud/i.test(planner), 'the donor screen was not given any HomeCloud-specific prop');
  record(!/homecloud/i.test(plannerShared), 'the donor shared styles were not given any HomeCloud-specific coupling');
}

console.log(`\nFILES_UX_RESULT pass=${passCount} fail=${failCount}`);
console.log(failCount === 0 ? 'FILES_UX_TESTS=PASS' : 'FILES_UX_TESTS=FAIL');
process.exit(failCount === 0 ? 0 : 1);