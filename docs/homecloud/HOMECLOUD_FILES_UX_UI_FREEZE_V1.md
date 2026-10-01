# HomeCloud Files UX/UI Freeze V1

Status: **frozen product contract for Stage 3**.  This document records the
Files V1 agreement; it does not redesign it.

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

## Authority, safety, and states

All requests derive the authenticated user and active Household server-side.
IDs are Household-validated. Backend capability authority remains canonical:
`homecloud.view` browse/search, `homecloud.contribute` intake/scanner,
`homecloud.organize` folder/create/rename/delete, move, and metadata edit.
The client projection is UX only. Cross-Household reads, search, references,
and mutations fail. Storage paths remain server generated; staging stays hidden
and ordinary reads expose active content only.

Mutations use canonical results plus scoped invalidation/refetch, preserve
context on recoverable errors, and single-flight duplicate submissions where
appropriate. Loading resembles the grid; empty and error states offer an
appropriate next action. The experience uses HomePlus semantic tokens and
works in Light, Dark, and System themes.

## Explicit exclusions

No Memories product, full viewer, temporary file detail, nested folders,
selection/bulk actions, trash UI, advanced filters, OCR, semantic search, or
fake preview behavior is introduced by Stage 3.
