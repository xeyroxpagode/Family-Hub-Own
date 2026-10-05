# HomeCloud Files UX/UI Freeze V1

Status: **frozen product contract for Stage 3**, amended by the Files Core
basic-operations slice (file selection + bulk Move) and by the Files Core closure
slice (**personal Favorites** and the **Guardar una copia** download contract).
This document records the Files V1 agreement; it does not redesign it.

## Mission and entry

HomeCloud helps a household **guardar, encontrar y volver a usar**.  It is one
module, entered through **Más → HomeCloud**, with sibling modes **Archivos**
and **Recuerdos**.  There is no intermediate dashboard or nested HomeCloud
bottom navigation.  Stage 3 implements Files; Recuerdos is reserved for Stage
4 and must not present a fake product surface.

## Browser model

Files is one compact, visual, information-first browser.  At the root it has a
prominent real search field, a title/action row (`Archivos` and `+`), and one
responsive virtualized grid.  Phone default is two substantial columns; wider
layouts can naturally add columns from a minimum tile width.  The primary grid
is never wrapped in a ScrollView.

Folders appear first, then only loose active Files (`folder_id = NULL`). Files
inside a folder never duplicate at root. Folders are flat only. Tapping a
folder enters the same browser in folder context; it contains files only and
the add action inherits that destination. Back restores the root context.

Folder and file tiles share one visual grammar: visual area, optional quiet
badge/indicator, contextual overflow, title below (maximum two lines), and
only minimal useful supporting information. Image/video previews are used only
when already available; PDFs and other documents use polished type fallbacks.
Original binaries are never fetched merely to decorate the grid.

There is no folders rail, files-row-list, recents surface, duplicate content
surface, permanent global FAB, or temporary file-detail/viewer. A file tap is
reserved for the Stage 5 Viewer. File Info and overflow actions remain real.

### Selection (Files V1)

File multi-select and a bulk Move **are** part of Files V1. The gesture contract
is explicit and does not move the reserved tap:

- a file tap **remains reserved for the Viewer** and is never a selection gesture;
- selection is **entered** by a long press on a File or by the explicit
  **Seleccionar** control, so the hidden gesture is never the only way in;
- **only while selection mode is active** does a tap toggle a File.

Selection belongs to the current browser context alone. It is cleared by a folder
change, a query change, a sort change, a Household change, and by leaving
selection mode; it **survives loading more rows**; and after a reconciliation a
selected id that is no longer visible is pruned. There is no cross-folder and no
cross-Household selection, folders are not selectable in bulk, and selection is
never persisted.

## Search and sort

Root search is global for the authenticated active Household and finds folder
names, file display names, and file notes, including files inside folders.
Folder-context search is scoped to that folder. Search is trim-normalized and
case-insensitive, server-backed/scalable, and never merely the currently
loaded client page. Results retain the tile grammar.

V1 sort has only **Recientes** and **Nombre A–Z**. Folders remain first at the
root. Default loose files order by `uploaded_at DESC` with deterministic id
fallback; name sort orders by display name. Search may retain canonical
relevance ordering. No filter-chip suite is part of Files V1.

### Favorites filter (Files V1)

Retrieving favorites uses the **existing** Files control surface: one compact
**Favoritos** toggle alongside sort and selection. There is no Favorites route,
no Favorites screen, no extra navigation level and no separate Favorites library.

**Favoritos** is a filter MODE and it composes with the rest of the context —
household scope, active lifecycle, folder, search, sort and pagination — and it is
filtered **server-side before the page is taken**. The client never removes
non-favorites from a page it already received, because that corrupts pagination,
has-more evidence, search and folder scope simultaneously.

Like **sort**, the mode **persists across folder navigation** (a folder change
still clears the query, whose meaning changes with the folder, and still
preserves the sort). A household switch resets it.

## Personal Favorites (Files V1)

**A File is shared Household content. A Favorite is a personal retrieval
preference of one person.** Therefore the member who marks a File favorite sees
it as favorite and **no other member is affected in any way**.

A Favorite is **not**: Household-global, folder organization, a permission state,
content lifecycle, or anything Memories consumes. It carries no bytes, copies no
content and does not change who may read, organize or delete the File.

Identity is `household + person + File`, stored in `homecloud_file_favorites` with
a unique constraint on that triple, so the mutation is idempotent and the
preference can never be recorded twice. The identity is the canonical person, not
a membership row and not an authentication user: a membership can change while
the person's own preference is still the person's. Household membership and
authority are still validated at request time.

Authority is an active Household member with `homecloud.view`: a personal
retrieval preference is **not** organization, so `homecloud.organize` is not
required and a viewer may favorite without being allowed to reorganize the
library. The server resolves the household and the person; the client states only
the intent.

Retrieval projects each File's `isFavorite` for the caller from the canonical
Files read, in the same seam as folder, search, sort and pagination.

## Add and intake

The compact `+` in the browser title/action row opens one Add sheet. At root:
**Elegir archivo**, **Escanear documento**, and **Nueva carpeta**. In a folder:
the first two only, with automatic folder inheritance. An empty state may use a
larger explicit **Agregar archivo** action.

File intake consumes the Stage-2 Shared Upload Engine and its LocalArtifact,
UploadJob, registration, signed upload, verify, finalize, and idempotency
contracts; it does not duplicate them. Scanner produces one PDF LocalArtifact
from one or more pages and passes it through that same engine. OCR is out of
scope. Scanner must not introduce an unsafe native dependency.

## Organization and information

Folders are optional, flat, and unique per Household using trim/case-insensitive
names. Create, rename, and delete use focused sheets. Deleting a folder is an
in-sheet destructive confirmation that clearly states the folder disappears
while its files survive at root (`folder_id = NULL`); it never deletes content.
Move changes only `folder_id`, allowing root or a same-Household folder.

File Info is an ActionSheet, never a detail route. It provides localized edits
for Name, Folder, Document date, and Note; useful optional-value actions replace
filler labels. Technical information is discrete and humanized. Existing
content identity, binary, and storage path are unchanged by organization or
metadata edits.

### Canonical File actions

Every File operation has exactly one home: one per-File ActionSheet host owns the
action grammar, in canonical order — **Información**, **Renombrar**, **Mover**,
**Guardar una copia**, **Compartir**, **Agregar a favoritos** / **Quitar de
favoritos** — with each row gated by the capability it needs. There is no second
menu that can perform a File operation.

**Guardar una copia** and **Compartir** are distinct intents over the same signed
original, not one conjoined action. The signed original is staged in the app's
own temporary area — an internal copy, never a destination — and then handed to
the **native system export UI**, which on iOS is where **Guardar en Archivos**
lives. HomePlus does not fake a destination picker the platform does not offer,
and it never presents an internal app path as the member's saved copy.

Neither intent reports a completed outcome. The system sheet closes without
telling the app whether **Guardar en Archivos** was chosen, so HomePlus states
the hand-off and leaves the destination to the member instead of claiming a save
it cannot prove; backing out of the sheet is a quiet, non-error outcome.

Both **Mover** paths — a single File and the selection — resolve a destination
through the **same** picker, which offers root (**Archivos**, `folder_id = NULL`)
or any same-Household folder. There is one destination grammar, not two.

A bulk Move is N of the **existing** single-file mutations
(`PATCH /api/homecloud/content/:contentId/file` carrying only `folderId`), one per
selected File. It adds no bulk or transaction endpoint, no schema change and no
migration, it moves no bytes, and it is deliberately **not atomic**: a per-item
failure is reported as such, the Files that already moved are **not** rolled back,
and the batch reconciles **once** through the window-preserving refresh.

**Favorito** is the one stateful action in the grammar: its row names the intent
the tap will perform, so it reads **Quitar de favoritos** on a File that already
is one. The toggle is idempotent in both directions, corrects the local
presentation as soon as the server answers, and never waits for an app restart.

**Abrir** and **Mover a la papelera** remain declared extension seams in that
grammar. They are ordered and named there so a later addition is a declaration
plus a handler, and they are **not offered** while they have no backend: no row is
ever painted for an action that cannot work.

## Authority, safety, and states

All requests derive the authenticated user and active Household server-side.
IDs are Household-validated. Backend capability authority remains canonical:
`homecloud.view` browse/search **and personal Favorites**,
`homecloud.contribute` intake/scanner,
`homecloud.organize` folder/create/rename/delete, move, and metadata edit.
The client projection is UX only. Cross-Household reads, search, references,
and mutations fail. A content id from another Household is answered exactly like
an unknown one, so existence cannot be probed across Households. Storage paths
remain server generated; staging stays hidden and ordinary reads expose active
content only.

Mutations use canonical results plus scoped invalidation/refetch, preserve
context on recoverable errors, and single-flight duplicate submissions where
appropriate. Loading resembles the grid; empty and error states offer an
appropriate next action. The experience uses HomePlus semantic tokens and
works in Light, Dark, and System themes.

## Explicit exclusions

Stage 3 introduced no Memories product, full viewer, temporary file detail,
nested folders, selection/bulk actions, trash UI, advanced filters, OCR, semantic
search, or fake preview behavior.

The Files Core basic-operations slice then added file multi-select and a bulk Move
to Files V1, as recorded above.

The Files Core closure slice then added **Personal Favorites** and closed the
**Guardar una copia** download contract, both recorded above. **The earlier
exclusion of Personal Favorites from Files V1 is superseded for Files**: a
personal Favorite is a per-person preference over a shared File, scoped to
`person + household + File`, and it is **not** Household-global and **not** the
Memories behavior. Memories does not consume it.

Still **not** part of Files: the full Viewer (a file tap stays reserved for it),
Lifecycle and Trash, multi-file intake, and copy/duplicate, tags, offline library
or version history.
