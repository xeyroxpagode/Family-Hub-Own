import fs from 'node:fs';
import path from 'node:path';
import {
  MEMORY_SELECTION_INITIAL,
  cancelMemorySelection,
  canConfirmMemorySelection,
  confirmMemorySelection,
  createMemorySelectionSession,
  enterMemorySelection,
  isMemorySelecting,
  memorySelectionActionsLabel,
  memorySelectionCountLabel,
  resetMemorySelectionScope,
  setMemorySelectionExclusions,
  toggleMemorySelection,
  type MemorySelectionState,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemorySelection';
import {
  MEMORY_TYPE_COLLECTIONS,
  memoryCollectionId,
  parseMemoryCollectionId,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryCollectionsPagination';
import { albumRemoveSelectionLabel as memorySelectionRemoveLabel } from '../front/mi-front-limpio/services/homecloud/homecloudAlbumScope';
import type { HomeCloudMemoryListItem } from '../front/mi-front-limpio/services/homecloud/homecloudTypes';

/**
 * HC2-C C1 + C2 + BUG D — the Memories ROOT and SELECTION contracts, executed.
 *
 * WHAT IS BEHAVIOURAL HERE AND WHY
 * --------------------------------
 * The selection session is a pure value, so every claim about it is EXECUTED:
 * that entering a selection cannot change the root's information architecture is
 * proven by showing the session carries no surface information at all, so there
 * is nothing in it that COULD change one.
 *
 * A small number of STRUCTURAL assertions are included and marked as such. They
 * exist only where the truth genuinely lives in a declaration: that the internal
 * `Recuerdos | Colecciones` selector is gone, that the composed root header is
 * not a function of `selecting`, and that the permanent Album `X` is gone.
 */

let failed = 0;
function check(value: boolean, label: string) {
  if (value) console.log(`PASS: ${label}`);
  else { failed += 1; console.error(`FAIL: ${label}`); }
}
const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const code = (file: string) => read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

function memory(id: string): HomeCloudMemoryListItem {
  return {
    id, kind: 'image', role: 'memory', displayName: null, mimeType: 'image/test', extension: null,
    sizeBytes: null, uploadedByMemberId: null, uploadedAt: null, hasPreview: false,
    hiddenFromResurfacing: false, caption: null, writtenText: null, capturedAt: null,
    capturedYear: null, capturedMonth: null, capturePrecision: 'unknown', albumIds: [],
    favorite: false,
  } as unknown as HomeCloudMemoryListItem;
}

console.log('\n=== HC2-C MEMORIES ROOT + SELECTION (C1 / C2 / BUG D) ===');

const screen = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const screenCode = code('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const cardsCode = code('front/mi-front-limpio/components/homecloud/MemoryCards.tsx');
const detailCode = code('front/mi-front-limpio/components/homecloud/AlbumDetailView.tsx');

// ---------------------------------------------------------------------------
// 1. BUG C — THE SESSION CANNOT CARRY A NAVIGATION DESTINATION
// ---------------------------------------------------------------------------
{
  check(!('source' in MEMORY_SELECTION_INITIAL), 'the session no longer has a `source` field');
  check(
    Object.keys(MEMORY_SELECTION_INITIAL).sort().join() === 'excludedIds,mode,purpose,selectedIds',
    'the session is exactly { mode, purpose, selectedIds, excludedIds }',
  );
  const entered = enterMemorySelection(createMemorySelectionSession(), {
    purpose: { kind: 'generic' },
    initialContentIds: ['m-1'],
  });
  check(isMemorySelecting(entered) && entered.selectedIds.has('m-1'), 'a long press still enters selection with that Memory first');
  check(!('source' in entered), 'an entered session still carries no source, so entering CANNOT change the root IA');

  // The four productive entry points, none of which mentions a surface.
  const add = enterMemorySelection(createMemorySelectionSession(), { purpose: { kind: 'addToAlbum', albumId: 'album-1' }, excludedIds: [] });
  const remove = enterMemorySelection(createMemorySelectionSession(), { purpose: { kind: 'removeFromAlbum', albumId: 'album-1' }, initialContentIds: ['m-2'] });
  check(
    add.purpose?.kind === 'addToAlbum' && remove.purpose?.kind === 'removeFromAlbum' && remove.selectedIds.has('m-2'),
    'the Album add and remove entry points are preserved and surface-free',
  );
  check(
    confirmMemorySelection(entered)?.contentIds.join() === 'm-1'
    && confirmMemorySelection(add)?.contentIds.length === 0
    && confirmMemorySelection(remove)?.contentIds.join() === 'm-2',
    'the action grammar reads ids straight out of the session, with no surface involved',
  );
}

// ---------------------------------------------------------------------------
// 2. SELECTION IS CONTEXTUAL: entering and leaving changes nothing else
// ---------------------------------------------------------------------------
{
  const base = createMemorySelectionSession();
  const entered = enterMemorySelection(base, { purpose: { kind: 'generic' }, initialContentIds: ['m-1'] });
  const cancelled = cancelMemorySelection(entered);
  check(cancelled.mode === 'normal' && cancelled.purpose === null, 'cancel returns to normal mode');
  check(cancelled.selectedIds.size === 0 && cancelled.excludedIds.size === 0, 'cancel drops every selected and excluded id');
  check(
    JSON.stringify(cancelled) === JSON.stringify(base),
    'a cancelled session is byte-identical to a fresh one: there is no residual surface state',
  );
  check(cancelMemorySelection(base) === base, 'cancelling an idle session returns the identical instance');
  check(resetMemorySelectionScope().mode === 'normal', 'a household reset returns a normal session');

  // A membership mutation still prunes and still never resubmits.
  const excluded = setMemorySelectionExclusions(entered, ['m-1']);
  check(excluded.selectedIds.size === 0, 'a Memory that became a member is pruned from the pending selection');
  check(!canConfirmMemorySelection(excluded), 'with nothing selectable left the action affordance is disabled');
  check(canConfirmMemorySelection(entered), 'with something selected the action affordance is available immediately');
  const retoggled = toggleMemorySelection(excluded, 'm-1');
  check(retoggled === excluded, 'toggling an already-in-destination Memory is still a no-op');
}

// ---------------------------------------------------------------------------
// 3. NO `✓` GATE IN FRONT OF THE ACTIONS (§10)
// ---------------------------------------------------------------------------
{
  const entered = enterMemorySelection(createMemorySelectionSession(), { purpose: { kind: 'generic' }, initialContentIds: ['m-1', 'm-2'] });
  check(
    canConfirmMemorySelection(entered),
    'the actions are available from the FIRST FRAME of a selection, with no confirm step',
  );
  check(memorySelectionCountLabel(2) === '2 seleccionados', 'the exact count is visible while selecting');
  check(memorySelectionActionsLabel(1) === 'Acciones, 1 seleccionado', 'the actions affordance names its exact scope');
  check(memorySelectionActionsLabel(0) === 'Acciones, 0 seleccionados', 'and the honest zero case');
  check(memorySelectionRemoveLabel(1) === 'Quitar 1 del álbum', 'the Album removal copy is the frozen membership sentence');
  check(memorySelectionRemoveLabel(3) === 'Quitar 3 del álbum', 'and its plural');
  for (const forbidden of ['Eliminar', 'Borrar', 'Papelera', 'Quitar de HomeCloud']) {
    check(!memorySelectionRemoveLabel(3).includes(forbidden), `the removal copy never uses "${forbidden}"`);
  }
}

// ---------------------------------------------------------------------------
// 4. THE FOUR AUTOMATIC COLLECTIONS ARE REACHABLE DATA (§5)
// ---------------------------------------------------------------------------
{
  check(MEMORY_TYPE_COLLECTIONS.length === 4, 'Tipos has exactly the four frozen collections');
  check(
    MEMORY_TYPE_COLLECTIONS.map((ref) => ref.memoryKind).join() === 'image,video,audio,written',
    'Tipos renders them in the frozen product order, deterministically',
  );
  check(
    MEMORY_TYPE_COLLECTIONS.every((ref) => ref.kind === 'type'),
    'every entry of the Tipos row is a TYPE ref, never an Album',
  );
  for (const ref of MEMORY_TYPE_COLLECTIONS) {
    const id = memoryCollectionId(ref);
    const parsed = parseMemoryCollectionId(id);
    check(parsed !== null && parsed.kind === 'type' && parsed.memoryKind === ref.memoryKind, `${ref.memoryKind} has a stable, round-trippable collection id`);
  }
}

// ---------------------------------------------------------------------------
// 5. SUPPLEMENTARY STRUCTURAL ASSERTIONS — the truths that live in code shape
// ---------------------------------------------------------------------------
{
  const screenFile = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
  const screenCode = code('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
  const header = read('front/mi-front-limpio/components/homecloud/MemorySelectionHeader.tsx');
  const headerCode = code('front/mi-front-limpio/components/homecloud/MemorySelectionHeader.tsx');
  const cardsCode = code('front/mi-front-limpio/components/homecloud/MemoryCards.tsx');
  const selectableCode = code('front/mi-front-limpio/components/homecloud/MemorySelectableCard.tsx');
  const detailCode = code('front/mi-front-limpio/components/homecloud/AlbumDetailView.tsx');
  const tilesCode = code('front/mi-front-limpio/components/homecloud/MemoryCollectionTile.tsx');
  const rail = read('front/mi-front-limpio/components/homecloud/AlbumsRail.tsx');
  const intake = read('front/mi-front-limpio/services/homecloud/MemoryIntake.tsx');
  const intakeCode = code('front/mi-front-limpio/services/homecloud/MemoryIntake.tsx');
  const globalScreen = read('front/mi-front-limpio/screens/HomeCloudScreen.tsx');
  const selectionCode = code('front/mi-front-limpio/services/homecloud/homecloudMemorySelection.ts');

  /*
   * ABSENCE assertions below read the COMMENT-STRIPPED source.
   *
   * These files deliberately DOCUMENT what was removed and why, so an assertion
   * over the raw text would match its own explanation and pass for the wrong
   * reason. Stripping comments first makes "this symbol is gone" mean gone.
   */
  check(!headerCode.includes('SegmentedControl'), 'the selection header renders NO SegmentedControl');
  check(!/Recuerdos \| Colecciones/.test(headerCode) && !headerCode.includes("value: 'collections'"), 'the internal Recuerdos|Colecciones selector is gone');
  check(!selectionCode.includes('MemorySelectionSource') && !selectionCode.includes('collectionsRoot'), 'the pure session module has no source concept at all');
  check(!screenCode.includes('switchTab'), 'switchTab is gone');
  check(!screenCode.includes('MEMORY_SELECTION_SOURCE_COLLECTIONS_ROOT'), 'the collections-root selection source is gone');
  check(!screenCode.includes('COLLECTIONS_ROOT_TITLE') && !screenCode.includes('COLLECTIONS_BACK_LABEL'), 'the Colecciones root copy is gone');

  // The composed root header is CONSTANT (C3/C1).
  check(/ListHeaderComponent=\{rootHeader\}/.test(screen), 'the SectionList header is one composed element');
  check(
    !/ListHeaderComponent=\{[\s\S]{0,200}selecting/.test(screen),
    'the root header does NOT branch on selecting: selection cannot replace the root IA',
  );
  check(screen.includes('<AlbumsRail') && screen.includes('<MemoryTypesSection'), 'the composed header is Albums + Types');
  const headerBlock = screenCode.slice(
    screenCode.indexOf('const rootHeader = ('),
    screenCode.indexOf('const timelineEmptyState') + 4000,
  );
  check(
    headerBlock.indexOf('<AlbumsRail') >= 0 && headerBlock.indexOf('<AlbumsRail') < headerBlock.indexOf('<MemoryTypesSection'),
    'the section ORDER is Álbumes then Tipos, structurally',
  );
  check(screen.includes('ListHeaderComponent={rootHeader}') && screen.includes('styles.rootHeader'), 'the header is one container above the Timeline');

  // The Timeline is preserved below.
  check(/sections=\{gridSections\}/.test(screen), 'the Timeline SectionList is preserved');
  check(screen.includes('stickySectionHeadersEnabled={false}') && screen.includes('onEndReachedThreshold={0.6}'), 'sticky headers and the pagination threshold are untouched');
  check(screen.includes('Mostrar más recuerdos'), 'the pagination footer copy is preserved');
  check(screen.includes('solveMemoryRefreshGate') && screen.includes('mountRefreshControl'), 'the D2 refresh gate is untouched');
  check(screen.includes('exitGesture.sync(selecting)') && screen.includes('createMemoryExitGestureLock'), 'the D3 exit gesture lock is untouched');
  check(screen.includes('MEMORY_DRAG_TAKEOVER_SLOP') === false, 'the drag takeover slop stays owned by MemorySelectableCard, not re-declared');
  check(selectableCode.includes('MEMORY_DRAG_TAKEOVER_SLOP'), 'D4 slop constant is still in the card');
  check(screen.includes('handleDragArm') && screen.includes('applyMemoryVisualRange'), 'D4 long-press entry, drag arming and range application are intact');

  // The global selector is untouched.
  check(globalScreen.includes("'Recuerdos'") || globalScreen.includes("{ value: 'memories', label: 'Recuerdos' }"), 'the GLOBAL Archivos|Recuerdos selector is preserved');

  // A collection is screen state and a nested overlay.
  check(screenCode.includes('const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);'), 'the open collection is ordinary screen state');
  check(screenCode.includes('<MemoryCollectionDetailView'), 'a collection opens as the SAME nested overlay an Album does');
  check(screenCode.includes('StyleSheet.absoluteFill'), 'that overlay is an absolute layer, not a body swap');
  check(read('front/mi-front-limpio/components/homecloud/MemoryCollectionDetailView.tsx').includes('accessibilityViewIsModal'), 'the collection overlay is a modal layer like the Album one');
  check(!screenCode.includes('rootScrollRef') && !screenCode.includes('handleRootScroll'), 'the parallel ScrollView and its own offset are gone');
  check(!screenCode.includes('MemoryCollectionAlbumTile'), 'the duplicate Album tile of the old Colecciones root is gone');
  check(!tilesCode.includes('MemoryCollectionAlbumTile'), 'and so is the duplicate component itself');

  // The header contract.
  check(header.includes('memorySelectionCountLabel(selectedCount)'), 'the selection count is rendered in the header');
  check(header.includes('onOpenActions') && header.includes('name="ellipsis-horizontal"'), 'the actions affordance is an ellipsis button');
  check(!headerCode.includes('checkmark'), 'there is NO confirm tick in the selection header any more');
  check(!headerCode.includes('onConfirm'), 'and no confirm handler at all');
  check(screen.includes('Reintentar los que fallaron') === false && header.includes('Reintentar los que fallaron'), 'the partial-failure retry of ONLY the failed ids is preserved');

  // ONE action host, never a stacked sheet.
  check(/visible=\{selectionSheetOpen \|\| viewerActionsContentId !== null\}/.test(screen), 'the action sheet and the destination picker are ONE host (ST-5: viewer actions ride the SAME host)');
  check(screen.includes('const selectionSheetOpen = selectionActionsOpen || destinationPickerOpen;'), 'their visibility is a single derived value, so they cannot stack');
  check((screen.match(/<AdaptiveActionMenu/g) ?? []).length === 1, 'exactly ONE adaptive action host is rendered in Memories');

  // Run A organisation actions.
  check(screen.includes('Agregar a un álbum'), 'the root/collection action is Agregar a un álbum');
  check(screen.includes('memorySelectionRemoveLabel(selection.selectedIds.size)'), 'the Album action is Quitar N del álbum, from the same frozen copy');
  check(screen.includes('runAlbumMemberships') && screen.includes('runKnownDestinationSelection'), 'both run through the ONE existing membership composer');
  check(screen.includes('Compartir') && screen.includes('Compartir varios recuerdos aún no está disponible') && !screen.includes('Sharing.shareAsync'), 'ST-5: Compartir exists in selection; multi OS sheet is honest-blocked, never faked');

  // BUG D — the permanent X.
  check(!cardsCode.includes('AlbumScopeRemove') && !cardsCode.includes('albumScopeAction'), 'the per-card remove affordance is gone from MemoryCards');
  check(!cardsCode.includes('MemoryAlbumScopeAction'), 'the remove-action type is gone');
  check(!cardsCode.includes('albumScope'), 'and so is the square white wrapper that caused the artifact');
  check(!selectableCode.includes('albumScopeAction'), 'the interaction wrapper no longer forwards it');
  check(!detailCode.includes('albumScopeAction') && !detailCode.includes('onRemoveMemory'), 'the Album detail no longer attaches a per-tile remove');
  check(!screenCode.includes('onRemoveMemory'), 'and the screen no longer passes one');
  check(
    read('front/mi-front-limpio/services/homecloud/homecloudMemoryAlbumRemoval.ts').includes('export async function removeMemoryFromOpenAlbum'),
    'the single-Memory removal OPERATION is preserved for Run B as an exported seam',
  );

  // C3 — Album rail smart collections, final create tile, and cover states.
  check(
    rail.includes('function FavoritesTile') && rail.includes('accessibilityLabel="Abrir Favoritos"') && rail.includes('onOpenFavorites'),
    'the rail starts with the Favoritos smart collection tile',
  );
  check(
    /<FavoritesTile[\s\S]*?\{albums\.map[\s\S]*?<AlbumTile[\s\S]*?\{canOrganize \? <CreateAlbumTile/.test(rail),
    'the album creation affordance is the final rail tile after real Albums',
  );
  check(read('front/mi-front-limpio/components/homecloud/AlbumTile.tsx').includes('AlbumCoverLoading'), 'a resolving cover has its own loading state');
  check(read('front/mi-front-limpio/components/homecloud/AlbumTile.tsx').includes("preview.phase === 'idle' || preview.phase === 'loading'"), 'only idle/loading are treated as loading: an error is not a skeleton');
  check(read('front/mi-front-limpio/components/homecloud/AlbumTile.tsx').includes('albumItemCountLabel(album.itemCount)'), 'the exact Album aggregate stays verbatim');

  // C1 §7 — the create `+`.
  check(intake.includes('accessibilityLabel="Crear recuerdo"'), 'the create affordance keeps its accessibility label');
  check(/createTrigger: \{[\s\S]*?minWidth: touchTargets\.normal,[\s\S]*?minHeight: touchTargets\.normal,[\s\S]*?backgroundColor: 'transparent'/.test(intake), 'its hit area is an invisible 44x44 with no visible background');
  check(!/variant="icon"[\s\S]{0,200}accessibilityLabel="Crear recuerdo"/.test(intakeCode), 'the create `+` is no longer a filled circular AppButton');
  check(intake.includes("haptic=\"light\""), 'the existing haptic is preserved');
  check(intake.includes('disabled={triggerDisabled}'), 'the contribute-capability disabled semantics are preserved');

  // §9 — the routine Refresh button is gone, the capability is not.
  check(!screenCode.includes('Actualizar recuerdos'), 'the routine Refresh button is gone from the header');
  check(!screenCode.includes('name="refresh"'), 'and its refresh glyph is gone with it');
  check(screenCode.includes('handleGridRefresh') && screenCode.includes('void refresh();'), 'the refresh PATH is preserved for pull-to-refresh and reconciliation');
  check(screenCode.includes('<RefreshControl') && screenCode.includes('onRefresh={handleGridRefresh}'), 'pull-to-refresh stays mounted');
  check(screenCode.includes('retryLabel="Reintentar"'), 'real error states keep an explicit retry');
}

// ---------------------------------------------------------------------------
// 6. Membership semantics are UNCHANGED by the leave-out (BUG D)
// ---------------------------------------------------------------------------
{
  const scopeModule = read('front/mi-front-limpio/services/homecloud/homecloudAlbumScope.ts');
  const scopeCode = code('front/mi-front-limpio/services/homecloud/homecloudAlbumScope.ts');
  check(scopeModule.includes('Los recuerdos no se eliminan'), 'deleting an Album still says the Memories survive');
  check(scopeCode.includes('ALBUM_DELETE_MEMORIES_SURVIVE_COPY'), 'that copy is still an exported constant');
  check(scopeCode.includes('albumRemoveSelectionLabel'), 'the membership removal label is still owned here');
  check(!/trash|papelera|\brestore\b|purge/i.test(scopeCode), 'no Trash / restore / purge surface exists in the Album scope module');
  check(
    screenCode.includes("action.id === 'trash'") && screenCode.includes("action.id === 'purge'")
      && !cardsCode.includes('papelera') && !detailCode.includes('papelera'),
    'P3 lifecycle actions are routed by the Memories screen, never by Album cards or detail membership UI',
  );
}

console.log(failed === 0 ? '\nHC2C_MEMORIES_ROOT_TESTS=PASS' : `\nHC2C_MEMORIES_ROOT_TESTS=FAIL fail=${failed}`);
if (failed) process.exitCode = 1;
