\# HOMECLOUD — PRODUCT / EXPERIENCE FREEZE V1.3



Status: FROZEN

Date: 2026-09-09



Canonical Stage-1 base:



H7

002bde4



Gate:



HC1\_FOUNDATION\_PASS



This document defines the current canonical Product Truth and Experience Truth

for HomeCloud V1.



It supersedes previous HomeCloud product/experience decisions only where this

document explicitly changes them.



Implementation convenience does not override this document.



Physical CURRENT may reveal implementation gaps, but must not redefine product

behavior without an explicit Product Truth change.



\---



\# 0. PRODUCT MISSION



HomeCloud is the canonical family-content layer inside HomePlus.



Its purpose is to:



1\. preserve family content once;

2\. make it easy to find;

3\. organize it according to human intent;

4\. allow the same canonical content to be reused across HomePlus.



HomeCloud is NOT a generic Dropbox/Drive clone.



Core principle:



> Guardar una vez. Encontrar fácil. Reutilizar en toda la casa digital.



\---



\# 1. TWO HUMAN INTENTIONS



HomeCloud has exactly two primary semantic experiences.



\## FILE



Human meaning:



> "Lo guardo porque puedo necesitarlo."



Typical examples:



\- documents;

\- PDFs;

\- warranties;

\- receipts;

\- scans;

\- school/work material;

\- manuals;

\- useful images.



\## MEMORY



Human meaning:



> "Lo guardo porque quiero volver a esto."



Typical examples:



\- photos;

\- videos;

\- family audio;

\- voices;

\- emotional moments.



MIME does not decide role.



User/contextual intent is authoritative.



Same media MIME may represent FILE or MEMORY.



\---



\# 2. CANONICAL CONTENT MODEL



Canonical content remains:



HomeCloudContent

├── FILE

└── MEMORY



MEMORY V1 media:



\- image/\*

\- video/\*

\- audio/\*



No new AUDIO role exists.



Storage binary and semantic identity remain separate.



Postgres:

semantic authority.



Supabase Storage:

byte custody.



A canonical binary must not be duplicated merely because another HomePlus

module uses it.



\---



\# 3. HOMEPLUS NAVIGATION



HomeCloud lives in:



Más

└── HomeCloud



`Más` must contain a real HomeCloud product row/card.



Conceptually:



HomeCloud

Archivos y recuerdos de tu familia

>



HomeCloud is NOT presented as a technical Storage setting.



\---



\# 4. NO INTERMEDIATE HOMECLOUD ROOT



Previous direction:



HomeCloud

→ choose Archivos / Recuerdos via large cards



is superseded.



V1 MUST NOT introduce a menu-like intermediate HomeCloud Root whose primary

purpose is only to choose between Files and Memories.



Reason:



\- creates "Más dentro de Más";

\- adds unnecessary hierarchy;

\- delays access to real content;

\- wastes first-screen information density.



Canonical navigation:



Más

→ HomeCloud



opens directly into the HomeCloud content surface.



\---



\# 5. HOMECLOUD PRIMARY IA



HomeCloud uses two persistent sibling tabs / segmented destinations:



HomeCloud



\[ Archivos ] \[ Recuerdos ]



No nested HomeCloud bottom-navigation bar.



No third primary "Upload" destination.



No primary cards for:



\- Upload;

\- Papelera;

\- Scanner;

\- Personas;

\- Lugares;

\- Configuración.



Files and Memories are sibling product modes inside the same HomeCloud surface.



First HomeCloud entry may default to Archivos.



Subsequent ordinary entry should preserve the last-used HomeCloud tab where

consistent with current HomePlus state/navigation conventions.



Explicit deep links/context may open the appropriate tab directly.



\---



\# 6. GLOBAL HOMECLOUD UX PRINCIPLES



\## 6.1 CONTENT FIRST



The family content itself must appear before administrative tools.



Do not fill the upper part of the screen with:



\- filters;

\- management cards;

\- configuration;

\- empty categories;

\- technical controls.



Primary goal:



view / find content.



Secondary goal:



manage content.



\---



\## 6.2 DO NOT ASK WHAT CONTEXT ALREADY KNOWS



A surface defines intent where possible.



Archivos

→ FILE



Recuerdos

→ MEMORY



Folder context

→ initial Folder destination



Album context

→ initial Album destination



Do not ask the user to reconfirm these facts during ordinary intake.



\---



\## 6.3 UNKNOWN DATA IS NOT UI CONTENT



If optional semantic information is unknown, omit it.



Do NOT render placeholder information merely to complete layout.



Examples:



captured\_at unknown

→ no date displayed



caption NULL

→ no caption row



note NULL

→ no note row



location unknown

→ no location row



member provenance unavailable

→ no fake uploader identity



preview absent

→ fallback behavior, not "Preview missing"



Internal unknown state may still exist in DB.



UI does not need to expose it.



\---



\## 6.4 ORGANIZATION MUST NEVER BLOCK SAVING



FILE may exist without Folder.



MEMORY may exist without Album.



Folder/Album assignment is optional.



No user should have to organize content before preserving it.



\---



\## 6.5 FIND BEFORE ORGANIZE



Especially for Files:



Search and recognition are more important than forcing Folder organization.



`folder\_id = NULL` is a healthy normal state.



Do not describe unfiled content as a failure or unfinished task.



\---



\## 6.6 REVIVE BEFORE ADMINISTER



Especially for Memories:



The experience should prioritize:



\- seeing;

\- remembering;

\- exploring;

\- resurfacing;



before management controls.



\---



\# 7. ONE-HAND PRODUCT REQUIREMENT



HomeCloud V1 must be designed for normal mobile use with one hand.



Frequent actions should be reachable primarily in comfortable thumb zones.



Frequent:



\- Add File;

\- Add Memories;

\- Search;

\- Play/Pause;

\- selection actions.



Rare/destructive actions may intentionally be less prominent.



Touch targets should follow HomePlus accessibility conventions and generally

provide approximately 44–48dp/pt interactive area where appropriate.



No critical frequent action may depend exclusively on a tiny top-right icon.



\---



\# 8. FILES — PRIMARY EXPERIENCE



Files is utility/information-first.



Visual character:



\- compact;

\- trustworthy;

\- recognizable;

\- information-efficient;

\- calm.



Files must NOT imitate the visual density/behavior of Memories.



\---



\# 9. FILES ROOT IA



Canonical Files surface:



HomeCloud

\[ Archivos ] \[ Recuerdos ]



\[ Buscar archivos ]



Carpetas                 <conditional>



Archivos

────────────────────────

file rows

file rows

file rows

...



\[ Agregar archivo ]



The cognitive hierarchy is:



1\. FIND

2\. ORIENT

3\. BROWSE

4\. ACT



Meaning:



"sé qué necesito"

→ Search



"sé dónde lo guardé"

→ Folder



"lo reconozco cuando lo veo"

→ Files list



"quiero guardar algo"

→ Add File



\---



\# 10. FILE SEARCH



Search Files belongs to Stage 3.



Search V1 must remain metadata-first.



Expected searchable semantic sources include:



\- display name;

\- note;

\- Folder name/context;

\- document date;

\- type/MIME filters where useful.



Do not implement OCR/vector/AI Search in core Stage 3.



Search scope must clearly remain Files.



Do NOT expose a generic mixed FILE+MEMORY HomeCloud search as the default V1

experience.



\---



\# 11. FILE LIST



Files Root contains a primary continuous File list.



Default technical/product ordering for the root may use:



uploaded\_at DESC



because the section represents the ordinary current library and naturally

shows recently added content first.



Do NOT create a duplicate permanent section:



"Agregados recientemente"



followed by:



"Todos los archivos"



containing overlapping content.



Use one list plus sort/filter controls.



Possible V1 sorting:



\- recently added;

\- name;

\- document date where applicable.



Exact UI control design follows HomePlus primitives.



\---



\# 12. FOLDERS



Folders remain V1 core but secondary.



Rules:



\- flat only;

\- no nested folders;

\- File 0..1 Folder;

\- folder\_id NULL normal;

\- Search remains useful without Folders.



Files Root shows Folders only when useful.



If Household has zero Folders:



do not consume a large permanent root section explaining that no Folders exist.



Folder creation remains discoverable through appropriate organization/action

surfaces.



Folder deletion:



Folder disappears.

Files survive.

Affected Files become unfiled.



Folder deletion is NOT equivalent to deleting content.



UI/microcopy must communicate that distinction.



\---



\# 13. FILE FILTERING



Do NOT permanently fill Files Root with chips for:



\- PDF;

\- Images;

\- Video;

\- Audio;

\- Other;

\- No Folder;

\- size;

\- extension.



These are contextual filters.



Use progressive disclosure through an appropriate filter/sort control.



\---



\# 14. FILES INTAKE



Files has its own intake experience.



Files Intake always creates:



role = FILE



Ordinary Files Intake MUST NOT ask:



"Archivo o Recuerdo?"



Entry examples:



Archivos

→ Agregar archivo



Folder Casa

→ Agregar archivo

→ destination = Casa by default



Files Root

→ Agregar archivo

→ destination may remain unfiled.



\---



\# 15. FILES INTAKE SOURCES — V1



V1 includes:



1\. Elegir archivo

2\. Escanear documento



Files Intake should remain concise.



Optional metadata must not become a mandatory form before saving.



The product may offer contextually useful naming/destination adjustments where

they materially help recognition, but ordinary preservation must remain fast.



\---



\# 16. DOCUMENT SCANNER — V1



Document Scanner is a V1 capability.



HomeCloud may consume it, but HomeCloud does NOT own scanner device mechanics.



Architecture ownership:



Shared Capture

└── Document Scanner



The scanner is reusable by future modules such as:



\- HomeCloud Files;

\- Finance;

\- Assets.



Shared Document Scanner owns:



\- camera mechanics;

\- camera permission handling;

\- document detection/crop via platform/library;

\- multi-page capture;

\- temporary local artifact generation;

\- basic technical capture metadata.



It does NOT own:



\- Household;

\- HomeCloud role;

\- Folder;

\- Finance semantics;

\- Asset semantics.



V1 scanner result:



multi-page scan

→ one PDF



Do NOT build an Adobe Scan clone.



Out of V1 scanner scope:



\- OCR editing;

\- signatures;

\- annotation suite;

\- advanced filters;

\- pro image editing.



\---



\# 17. CROSS-MODULE SCANNER UX



Shared capability does NOT mean shared journey.



Finance future:



Finance

→ Adjuntar comprobante

→ Escanear



Assets future:



Asset

→ Agregar documento

→ Escanear



They must NOT send users through:



Finance

→ HomeCloud UI

→ Files

→ Scanner

→ Finance



Modules consume the same technical scanner primitive inside their own product

journeys.



When canonical persistence is desired, HomeCloud remains the canonical binary

platform underneath.



\---



\# 18. MEMORIES — PRIMARY EXPERIENCE



Memories is visual/nostalgia-first.



Visual character:



\- media-first;

\- emotional;

\- less technical metadata;

\- more breathing room than Files;

\- mixed image/video/audio.



Memory is not another File list.



\---



\# 19. MEMORIES ROOT IA



Canonical Memories surface:



HomeCloud

\[ Archivos ] \[ Recuerdos ]



\[ Buscar recuerdos ]



Para volver a ver       <conditional>



Álbumes                 <conditional>



Biblioteca / Timeline



\[ Agregar recuerdos ]



Conditional sections only exist when they have real useful content.



Do not render empty decorative sections merely to preserve a layout.



\---



\# 20. MEMORY SEARCH



Search Memories belongs to Stage 4.



Core V1 Search is metadata/domain based.



Expected V1 sources:



\- caption;

\- Album;

\- captured date;

\- media type.



Advanced semantic understanding belongs to HomeCloud Intelligence, not Stage 4

core.



\---



\# 21. SIMPLE RESURFACING — V1



Memories V1 includes simple resurfacing.



Purpose:



HomeCloud should not only preserve Memories.

It should occasionally help the family return to them.



V1 resurfacing may use existing canonical metadata such as:



\- captured\_at;

\- capture\_precision;

\- Album relationships;

\- current date.



Examples:



\- Un día como hoy;

\- Hace X años;

\- simple historical moments.



It MUST NOT require:



\- face recognition;

\- embeddings;

\- OCR;

\- semantic AI;

\- People.



If there is no meaningful resurfacing candidate:



the section does not render.



No noisy or forced filler.



\---



\# 22. MEMORY TIMELINE / LIBRARY



Global Memory Timeline is chronological:



newest → oldest



Canonical ordering target remains based on:



captured\_at DESC NULLS LAST

plus stable tie-breaker.



Do NOT use uploaded\_at as a fake Memory capture date.



Presentation may group by:



year

→ month/content



for navigation/readability.



Large libraries must eventually support efficient year navigation.



\---



\# 23. MEMORY DATE PRECISION



Internal model remains:



exact

month\_year

year

unknown



UI renders only what is known.



Examples:



exact

→ 15 de marzo de 1998



month\_year

→ Marzo de 1998



year

→ 1998



unknown

→ display no date



Editing may expose:



Agregar fecha



and allow:



\- exact date;

\- month/year;

\- year;

\- remove date.



Do NOT show:



"No la sé"



as ordinary read-mode content.



\---



\# 24. MEMORIES WITHOUT DATE



Memories with no reliable captured date remain part of the library.



They are NOT assigned uploaded\_at as a semantic fallback.



They may appear after chronological content in a neutral grouping such as:



"Otros recuerdos"



Exact copy may be tuned later.



\---



\# 25. ALBUMS



Albums remain CORE Memories V1.



Human meaning:



> A story/moment the family intentionally chose to group.



Album is not a Folder.



Rules:



\- Memory 0..N Albums;

\- Album 0..N Memories;

\- mixed image/video/audio;

\- Albums may be empty;

\- no owner;

\- no per-Album ACL;

\- duplicate names allowed;

\- no nested Albums.



\---



\# 26. ALBUM PRESENTATION ORDER



Global Timeline:



newest → oldest



Album presentation:



oldest → newest where reliable capture date exists.



Reason:



Albums generally present a narrative/event from beginning to end.



Memories without date may use stable fallback ordering based on membership

metadata.



Do not persist manual item position/order in V1.



\---



\# 27. ALBUM COVER



V1 does NOT persist manual Album cover selection.



No:



cover\_content\_id



Canonical V1 derived cover:



first suitable visual Memory according to stable Album presentation semantics.



If Album contains no suitable image/video:



use a stable HomePlus audio/mixed-media fallback.



Do not randomly rotate covers.



No collage requirement V1.



\---



\# 28. MEMORIES INTAKE



Memories has its own intake experience.



Memories Intake always creates:



role = MEMORY



Ordinary Memories Intake MUST NOT ask:



"Archivo o Recuerdo?"



Examples:



Recuerdos

→ Agregar recuerdos



Album "Viaje"

→ Agregar recuerdos

→ Album destination inherited.



From Memories Root:



Album destination remains optional.



Memory 0 Albums is valid.



\---



\# 29. MEMORIES INTAKE SOURCES — V1



V1 includes:



1\. Fotos y videos

2\. Audio existente

3\. Grabar recuerdo



No mandatory caption/date form before ordinary preservation.



Metadata may be edited later.



Reliable technical/capture metadata may be derived automatically where safe.



\---



\# 30. AUDIO MEMORY



Audio is a first-class MEMORY media type.



It is NOT:



\- an Audio role;

\- an Audio Folder;

\- a separate Storage bucket.



Audio Memory UX should prioritize human context.



Typical display:



voice/audio identity

duration

date if known



Do not prioritize:



filename

codec

MIME

technical metadata



unless inside deeper Info/debug contexts.



\---



\# 31. AUDIO RECORDER — V1



Audio recording is a V1 shared-capture capability.



Architecture:



Shared Media Capture

└── Audio Recorder



Reusable by:



\- HomeCloud Memories;

\- Messages future.



Shared Audio Recorder owns:



\- microphone permission;

\- recording lifecycle;

\- local temporary recording;

\- technical duration;

\- basic playback/review before acceptance where required.



It does NOT own:



\- Household;

\- Memory semantics;

\- Message semantics;

\- Album assignment.



HomeCloud use:



Grabar recuerdo

→ Audio Recorder

→ CapturedAudio

→ Memories Intake

→ canonical MEMORY audio



Messages future may use the same recorder.



A Message audio is NOT automatically a Memory.



Memory remains a human intention.



Messages may later offer:



Guardar como recuerdo



when product logic requires it.



\---



\# 32. SHARED CAPTURE PRODUCT TRUTH



Shared Capture owns reusable device capture mechanics.



Shared Capture does NOT own domain meaning.



Conceptual boundary:



CAPTURE

→ shared infrastructure



MEANING

→ consuming module



CANONICAL FAMILY CONTENT

→ HomeCloud when appropriate



This applies to:



\- Document Scanner;

\- Audio Recorder;

\- future reusable capture capabilities.



\---



\# 33. UPLOAD — PRODUCT SURFACE CHANGE



Previous Product Truth referenced a shared generic HomeCloud Upload surface.



This is superseded.



V1 does NOT have a third primary user concept called:



"Upload"



Users act through:



Archivos

→ Agregar archivo



Recuerdos

→ Agregar recuerdos



The technical Shared Upload Engine remains canonical infrastructure.



\---



\# 34. SHARED UPLOAD ENGINE — CORE V1



Both Files Intake and Memories Intake consume one technical Upload Engine.



There MUST NOT be separate File and Memory upload pipelines.



Canonical lifecycle target:



register

→ staging

→ durable UploadJob

→ upload original

→ verify

→ finalize

→ active

→ preview best-effort independently



Preview generation MUST NOT block canonical finalize.



\---



\# 35. DURABLE UPLOADJOB



Upload reliability lives primarily in a durable client-side UploadJob model.



It must support eventual V1 behavior for:



\- progress;

\- retry;

\- resume;

\- app restart;

\- connection interruption;

\- cancellation;

\- batch;

\- partial failures.



No SQL UploadJob table is required by Product Truth.



Do not introduce one unless a later audited architecture requirement proves it

necessary.



\---



\# 36. UPLOAD EXPERIENCE



Upload must not unnecessarily imprison the user in a blocking progress screen.



Preferred V1 interaction direction:



select/capture

→ intake

→ background-capable upload activity

→ user may continue using the relevant HomeCloud surface



Upload activity may expose compact progress and deeper detail only when useful.



Do not prematurely generalize it into a global HomePlus background-task

framework unless another module proves that need.



Build a clean HomeCloud boundary capable of future reuse.



\---



\# 37. OPTIMISTIC UPLOAD PROJECTION



Normal backend reads hide staging content.



Frontend may project local pending UploadJobs into relevant HomeCloud

collections to provide immediate perceived feedback.



Pending UI is NOT canonical server content.



On finalize:



local pending representation

→ reconciles with canonical Content.



Failed pending uploads must remain clearly distinguishable from successfully

stored canonical content.



\---



\# 38. PARTIAL FAILURE



Batch failure must be item-aware.



Example:



37 uploaded

3 failed



UI should preserve the 37 successes and allow retrying the 3 failures.



Do NOT require reselecting/reuploading an entire successful batch because one

item failed.



\---



\# 39. OFFLINE / RESTART



V1 direction:



durable pending uploads

→ KEEP



automatic/manual retry after reconnect

→ KEEP



full offline HomeCloud library sync

→ OUT V1



mass offline download

→ OUT V1



Previously available local metadata/previews may be cached according to normal

frontend policy, but HomeCloud does not promise complete offline availability.



\---



\# 40. EXACT DUPLICATES



HomeCloud V1 should detect exact binary duplicates where technically practical.



Exact duplicate detection is infrastructure/technical metadata, not ordinary

product DTO metadata.



Within the same Household:



exact canonical duplicate detected

→ do not silently store another identical binary by default.



User experience should explain that the content already exists.



Where context permits, reuse the existing canonical content relationship

instead.



Example:



existing Memory

\+ upload attempt from Album

→ existing Memory may be added to Album instead of duplicating bytes.



Do NOT implement near-duplicate / perceptual duplicate detection in core V1.



\---



\# 41. TECHNICAL MEDIA METADATA



Technical metadata derived from bytes is different from human semantic metadata.



Examples:



\- width;

\- height;

\- duration;

\- orientation;

\- technical capture metadata.



It may be required for:



\- grids;

\- video;

\- audio;

\- viewers;

\- preview generation.



Do not blindly pollute `homecloud\_contents` with every derived property.



Stage 2 must audit CURRENT and introduce only the minimum reusable derived

technical metadata model genuinely required.



Human semantic authority remains separate.



\---



\# 42. QUOTA / LIMITS



HomeCloud V1 architecture recognizes:



\- configurable per-file maximum;

\- configurable Household storage quota.



Exact commercial/runtime values are NOT frozen here.



They must not be scattered as arbitrary hardcoded constants.



Product must support understandable states for:



\- file too large;

\- insufficient Household storage.



Trash content continues to consume Storage while its binary remains preserved.



\---



\# 43. VIEWERS — V1 CORE



HomeCloud V1 requires native/in-app consumption where reasonable for:



\- Image;

\- Video;

\- Audio;

\- PDF;

\- generic/open-with fallback.



A complete HomeCloud cannot require users to leave the app for every stored

item.



Viewer implementation belongs primarily to Stage 5.



\---



\# 44. VIEWER CONTEXT



Opening content must preserve originating context.



Examples:



Album

→ Memory

→ Back

→ same Album position



Timeline 2019

→ Memory

→ Back

→ same Timeline position



Search query

→ result

→ Back

→ same query/filter/scroll state



Memories viewer may navigate previous/next within the originating collection

where appropriate.



This is V1 UX behavior.



It is NOT deferred motion polish.



\---



\# 45. SHARE AND SAVE



V1 includes both.



Share:

send/open through another person/app/system share flow.



Save:

create a user-accessible copy outside canonical HomeCloud where platform/MIME

semantics permit.



Neither action mutates or replaces the canonical HomeCloud original.



\---



\# 46. FILE ↔ MEMORY CORRECTION



Role correction remains V1 but is NOT ordinary intake.



Binary/content identity remains canonical.



FILE → MEMORY:



available as an understandable correction action.



Suggested concept:



"Tratar como recuerdo"



MEMORY → FILE:



also available for genuine misclassification, but lower-prominence/advanced.



Suggested concept:



"Tratar como archivo"



Memory→File may affect:



\- Album memberships;

\- Memory semantic metadata.



File→Memory may affect:



\- Folder relationship;

\- File semantic metadata.



UI must explain meaningful destructive organizational consequences before

conversion.



No duplicate binary.



\---



\# 47. PERMISSIONS



HomeCloud owns exactly four capabilities:



homecloud.view

homecloud.contribute

homecloud.organize

homecloud.delete



Global Permissions owns role→capability mapping.



HomeCloud must not introduce a local role matrix.



\---



\# 48. CONTRIBUTE VS ORGANIZE



Canonical V1 semantic distinction:



\## homecloud.contribute



May:



\- introduce NEW canonical content;

\- choose its initial valid destination during contribution.



Examples:



new FILE

→ choose Folder



new MEMORY

→ choose Album



This initial destination is part of contribution intent.



\## homecloud.organize



Required to reorganize ALREADY EXISTING content.



Examples:



existing File

→ move to another Folder



existing Memory

→ add/remove from Album



This distinction must be enforced backend-side.



Frontend capability projection is UX-only.



\---



\# 49. DELETE CAPABILITY



homecloud.delete covers destructive lifecycle actions.



V1 lifecycle behavior includes:



\- Trash;

\- Restore;

\- Purge.



Final purge semantics receive another lifecycle security stress test during

Stage 5/final closure because purge is irreversible.



No separate `homecloud.purge` capability is introduced in V1.



\---



\# 50. TRASH



Content Trash is soft/reversible.



V1:



Trash

→ reversible



Restore

→ reversible



Purge

→ irreversible



No automatic Trash retention/purge policy in initial V1.



Content remains in Trash until explicitly purged.



Trash binaries continue to count toward Storage usage while retained.



\---



\# 51. FOLDER LIFECYCLE



Folders do NOT use HomeCloud Trash.



Deleting a Folder:



\- removes Folder;

\- preserves Files;

\- Files become unfiled.



This is lower destructiveness than deleting content.



UI must reflect this difference.



\---



\# 52. ALBUM LIFECYCLE



Albums have:



active

trashed



Album soft trash preserves:



\- Memories;

\- Album membership relationships.



Restoring Album restores the curated grouping.



Purging Album permanently removes the Album and its relation rows.



Memories survive.



\---



\# 53. CROSS-MODULE CANONICAL REUSE



HomeCloud is the canonical binary/content platform for future reuse by:



\- Finance;

\- Assets;

\- Planner;

\- Feed;

\- Messages;

\- Geni;

\- other HomePlus modules.



Other modules should reference canonical content rather than persist duplicate

binary copies.



The domain semantics remain owned by each consuming module.



\---



\# 54. CROSS-MODULE CAPTURE



Shared capture capabilities may be used directly inside consuming module UX.



Do not route users through HomeCloud screens merely because HomeCloud will

eventually own the canonical binary.



Example:



Finance

→ Escanear comprobante



not:



Finance

→ HomeCloud

→ Files

→ Scan

→ Finance



Architecture reuse does not imply navigation reuse.



\---



\# 55. CROSS-MODULE LIFECYCLE DIRECTION



Cross-module reference lifecycle must be protected.



V1 architectural direction:



Trash

→ reference may survive and surface unavailable/trashed state as later defined.



Purge

→ must not silently destroy content still required by an active protected

cross-module reference.



Exact per-module policy is Stage 6 responsibility.



No module may silently rely on cascade behavior that destroys required

historical content.



\---



\# 56. FEED / MESSAGES BOUNDARY



HomeCloud is not a social network.



Feed/Messages own:



\- posts;

\- chat;

\- reactions;

\- communication semantics.



They may:



\- reference canonical HomeCloud content;

\- create/save canonical content through explicit product flows.



HomeCloud does NOT own:



\- likes;

\- comments;

\- chat threads;

\- reactions.



\---



\# 57. GENI BOUNDARY



Geni is NOT HomeCloud.



Geni may consume HomeCloud safely to:



\- find content;

\- help resurface Memories;

\- assist discovery;

\- suggest organization;

\- answer user requests.



HomeCloud must function completely without Geni.



Geni must respect:



\- active Household;

\- HomeCloud authority;

\- user permissions;

\- lifecycle.



\---



\# 58. PLACES / PRESENCE



HomeCloud Places integration is NOT V1 core.



Future direction may connect derived Memory location with future Presence

Household Places.



Possible future architecture:



Memory coordinates

→ Household Place Resolver

→ Presence-defined semantic place



Examples:



Casa

Escuela

Casa de los abuelos



Do NOT create a hard dependency now.



Specifically:



do not introduce a premature direct foreign-key relationship to a Presence

Places model that is not yet stable.



Current dependency:



NONE.



Future compatibility:



REQUIRED.



\---



\# 59. HOMECloud INTELLIGENCE



Advanced derived understanding belongs conceptually to HomeCloud Intelligence.



It must remain separate from canonical semantic content.



Do NOT make `homecloud\_contents` an AI metadata dump.



Candidate derived capabilities:



\- semantic visual search;

\- People;

\- Places;

\- OCR;

\- audio transcription;

\- smart event grouping;

\- near-duplicate detection;

\- natural-language compound search;

\- smarter resurfacing.



Derived intelligence should remain rebuildable when model/implementation

changes.



\---



\# 60. V1 CORE SEARCH VS INTELLIGENCE



V1 Core:



Files:

metadata/domain search.



Memories:

metadata/domain search.



Not required for V1 Core:



\- OCR;

\- embeddings;

\- face recognition;

\- vector search;

\- transcripts;

\- semantic object search.



These must not block Stage 2/3/4 Core completion.



\---



\# 61. PEOPLE



People belongs to the long-term Memories vision.



It is NOT V1 Core.



Current classification:



V1.1 / HIGH PRIORITY



A correct People product requires more than face detection:



\- clustering;

\- identity confirmation;

\- merge;

\- split;

\- hide;

\- privacy UX.



Do not ship a half-defined identity system merely to imitate Photos apps.



\---



\# 62. OCR



OCR is NOT required for Scanner V1.



Scanner V1 succeeds when it produces a reliable canonical document.



OCR is classified:



HomeCloud Intelligence

V1.1 / HIGH VALUE



especially for Files Search.



Do not expand Stage 2 into an OCR/computer-vision stage.



\---



\# 63. NOTIFICATIONS



HomeCloud does not generate noisy per-upload notifications in V1.



Do NOT send notifications such as:



"Juan agregó una foto"

"Juan subió 34 archivos"



without a separately audited household activity/notification design.



Feed may later represent meaningful family activity.



\---



\# 64. ACTIVITY LOG



No user-facing HomeCloud Activity Log is required V1.



Foundation provenance remains:



uploaded\_by

created\_by

added\_by

trashed\_by



Provenance is not ownership.



Do not invent an event-history subsystem without a concrete product need.



\---



\# 65. MEMBER LEAVES HOUSEHOLD



Canonical HomeCloud content belongs to the Household, not the uploader.



If a member leaves:



content remains.



Nullable provenance may disappear according to existing membership lifecycle.



Content must not disappear merely because uploader/creator membership is gone.



\---



\# 66. CROSS-HOUSEHOLD MOVEMENT



No direct canonical cross-Household move V1.



Content belongs to one Household.



Cross-Household user transfer may use:



Share/export

→ explicit new intake into destination Household.



Do not mutate canonical Household ownership silently.



\---



\# 67. EXTERNAL CLOUD IMPORT



OUT V1:



\- Google Photos migration;

\- iCloud bulk import;

\- Drive bulk import;

\- Dropbox import.



V1 intake uses supported device/local/shared-module flows.



External migration may be future product work.



\---



\# 68. DATA PORTABILITY



Full HomeCloud export is not required for V1 implementation.



However:



data portability is a future product responsibility.



Classification:



FUTURE REQUIRED



The family must not conceptually be permanently locked into HomeCloud.



\---



\# 69. UI IMPLEMENTATION QUALITY FROM DAY 1



Stage 2+ frontend must NOT be built as throwaway placeholder UI.



Visible HomeCloud frontend must immediately use:



\- HomePlus Experience System;

\- semantic tokens;

\- shared primitives;

\- Light;

\- Dark;

\- System;

\- safe areas;

\- correct typography;

\- touch targets;

\- pressed states;

\- loading;

\- errors;

\- empty states;

\- disabled states;

\- keyboard-safe behavior;

\- one-hand hierarchy.



Visual/interaction architecture is built during each product Stage.



\---



\# 70. MOTION BOUNDARY



Advanced Motion comes after functional journeys stabilize.



Motion must:



\- explain origin;

\- explain destination;

\- communicate state change;

\- reinforce hierarchy.



Motion must NOT exist simply to decorate.



Can be deferred to Motion/Performance passes:



\- shared-element transitions;

\- Album hero expansion;

\- advanced springs;

\- ambient audio playback effects;

\- advanced haptic tuning;

\- progress morphing;

\- complex scroll interpolation.



Must NOT be deferred:



\- layout;

\- hierarchy;

\- pressed feedback;

\- loading feedback;

\- safe navigation;

\- correct state transitions;

\- accessibility behavior.



Core UX must be excellent with advanced motion disabled.



\---



\# 71. REDUCED MOTION



Future motion implementations must respect platform reduced-motion settings.



HomeCloud must remain fully understandable without decorative transitions.



\---



\# 72. FILES VS MEMORIES VISUAL CONSISTENCY



Consistency does NOT mean identical layout.



Shared:



\- tokens;

\- typography family;

\- navigation;

\- primitives;

\- action behavior;

\- permission behavior;

\- error language.



Files:



compact / utility / recognition.



Memories:



visual / emotional / media-first.



Do not force both into the same presentation component merely to appear

"consistent".



\---



\# 73. SEARCH AS COMPLEXITY ABSORBER



Future Intelligence should reduce navigation complexity.



Do not create permanent root sections for every recognized concept:



\- Personas;

\- Lugares;

\- Autos;

\- Mascotas;

\- Comida;

\- Documentos;

\- Capturas.



Powerful Search may surface these without polluting root IA.



Intelligence should make HomeCloud simpler to navigate, not add dozens of

categories.



\---



\# 74. EMPTY STATES



Do not show multiple empty sections.



Files empty:



one clear explanation

\+

one relevant action.



Memories empty:



one clear explanation

\+

one relevant action.



No:



empty Folders

\+

empty recent

\+

empty library

\+

empty Albums

all stacked simultaneously.



Zero-dead-end principle:



every meaningful empty/error state should offer a reasonable next action where

one exists.



\---



\# 75. ERROR PREVENTION



UI should prevent invalid semantic actions before backend errors.



Examples:



Memory

→ never offer Folder assignment.



File

→ never offer Album assignment.



No permission

→ do not advertise unusable primary mutations when capability projection is

known.



Backend remains authoritative and revalidates every protected mutation.



\---



\# 76. PERFORMANCE AS UX



From first visible implementation:



interaction feedback must feel immediate.



Targets:



tap

→ immediate feedback



selection

→ immediate visual state



scroll

→ smooth



upload

→ immediate local representation



media

→ placeholder/fallback immediately



search

→ responsive



Advanced performance tuning occurs later, but poor perceived performance is

not acceptable as temporary UX.



\---



\# 77. HOUSEHOLD SWITCH



HomeCloud caches and ephemeral access state must be Household-safe.



On Household change:



\- HomeCloud entity caches must not leak previous Household data;

\- private signed access must not be treated as globally reusable;

\- selection/context must not incorrectly cross Households;

\- active upload behavior must follow Stage-2 audited UploadJob rules.



Never retarget an existing upload silently to another Household.



\---



\# 78. FOUNDATION DEBT



Known debt remains:



Household hard-delete

→ DB cascade removes HomeCloud rows

→ Storage objects can remain orphaned.



Classification:



GLOBAL LIFECYCLE DEBT



Must be solved before Final Engineering Acceptance.



Does not block Stage 2.



\---



\# 79. V1 — FROZEN PRODUCT SCOPE



HomeCloud V1 includes:



\## Platform



\- canonical FILE/MEMORY content;

\- Household scope;

\- authority;

\- private originals/previews;

\- safe reads;

\- cross-module canonical-reference architecture.



\## Files



\- contextual Files tab;

\- Search Files;

\- Folder support;

\- continuous Files library;

\- File Info/edit metadata;

\- File picker intake;

\- Document Scanner;

\- sorting/filtering;

\- organization.



\## Memories



\- contextual Memories tab;

\- Search Memories;

\- simple resurfacing;

\- Albums;

\- Timeline/Library;

\- image/video/audio Memories;

\- Memory Info/edit metadata;

\- photo/video intake;

\- audio import;

\- Record Memory.



\## Upload



\- one Shared Upload Engine;

\- durable UploadJob;

\- retry/resume;

\- restart safety;

\- batch;

\- partial failure;

\- offline pending;

\- preview best-effort;

\- exact duplicate handling;

\- configurable limits.



\## Consumption



\- Image Viewer;

\- Video Player;

\- Audio Player;

\- PDF Viewer;

\- Generic/Open With.



\## Actions



\- Share;

\- Save;

\- selection;

\- role correction;

\- metadata edit.



\## Lifecycle



\- Trash;

\- Restore;

\- Purge;

\- Folder deletion semantics;

\- Album lifecycle.



\---



\# 80. V1.1 / HIGH-PRIORITY EVOLUTION



Not V1 blockers:



\- semantic visual search;

\- People;

\- Places;

\- OCR;

\- audio transcription;

\- smart event grouping;

\- near-duplicate detection;

\- natural-language multimodal search;

\- advanced resurfacing.



These belong to HomeCloud Intelligence.



\---



\# 81. FUTURE



Explicit future candidates:



\- external cloud bulk import;

\- complete data export;

\- Presence Place resolution;

\- deeper Geni discovery;

\- richer cross-module content workflows;

\- advanced offline behavior where justified.



\---



\# 82. EXPLICITLY OUT OF V1



> SUPERSEDED FOR FILES: `favorites` was listed in this section and is no longer
> excluded. Personal Favorites ARE part of Files V1 — a personal, per-person
> preference over a shared File, scoped to `person + household + File`, NOT
> Household-global and NOT the Memories behavior. The canonical statement is in
> HOMECLOUD_FILES_UX_UI_FREEZE_V1.md. Every other item in this section stands.

Do NOT implement V1:



\- nested Folders;

\- nested Albums;

\- manual tags;

\- comments;

\- personal/private HomeCloud drive;

\- per-object ACL;

\- File version history;

\- replace-original/versioning workflows;

\- Album owner;

\- manual Album item order persistence;

\- manual persisted Album cover;

\- Album description;

\- multiple preview variants by default;

\- full offline library sync;

\- OCR;

\- vector search;

\- face recognition;

\- AI auto-Albums;

\- text-only Memory;

\- separate Audio role;

\- Audio bucket;

\- professional scanner editing suite;

\- audio editing studio;

\- HomeCloud chat/social features.



\---



\# 83. PRODUCT COMPLETION DEFINITION



HomeCloud is NOT Product Complete merely because backend endpoints exist.



A major feature reaches Product Complete only when its relevant gates pass:



1\. PURPOSE

2\. PRODUCT DEFINITION

3\. ARCHITECTURE

4\. IMPLEMENTATION

5\. DISCOVERABILITY

6\. LOW FRICTION

7\. ONE-HAND USABILITY

8\. ERROR PREVENTION

9\. RECOVERY

10\. VISUAL HIERARCHY

11\. LIGHT / DARK / SYSTEM

12\. ACCESSIBILITY

13\. PERFORMANCE FEEL

14\. REAL DEVICE

15\. FINAL ACCEPTANCE



Implementation PASS and Product Complete are separate concepts.



\---



\# 84. PRODUCT NORTH STARS



FILES



> Encontrar antes que organizar.



MEMORIES



> Revivir antes que administrar.



INTAKE



> Aportar antes que configurar.



LIFECYCLE



> Recuperable antes que irreversible.



GLOBAL HOMECLOUD



> El usuario no administra una base de datos.

> Guarda, encuentra y vuelve a usar cosas de su casa.



\---



\# 85. STAGE ROADMAP AFTER THIS FREEZE



STAGE 1 — CANONICAL FOUNDATION

✅ CLOSED

H7 = 002bde4



STAGE 2 — UPLOAD / INTAKE

NEXT



STAGE 3 — FILES



STAGE 4 — MEMORIES



Stages 2 + 3 + 4

= HOMECLOUD CORE MVP



STAGE 5 — VIEWERS / ACTIONS / LIFECYCLE



After Stage 5:

= HOMECLOUD STANDALONE FUNCTIONALLY COMPLETE



STAGE 6 — CROSS-MODULE INTEGRATION



STAGE 7.1 — ENGINEERING CLOSURE



STAGE 7.2 — PRODUCT CLOSURE



\---



\# 86. NEXT IMPLEMENTATION AUTHORITY



The next implementation stage is:



STAGE 2 — HOMECLOUD UPLOAD / INTAKE



Canonical base:



H7

002bde4



Stage 2 must consume this Freeze.



Stage 2 must NOT reopen:



\- FILE vs MEMORY identity;

\- two-tab HomeCloud IA;

\- generic Upload removal;

\- Shared Upload Engine ownership;

\- Shared Capture ownership;

\- Scanner V1 inclusion;

\- Audio Recorder V1 inclusion;

\- Folder/Album optionality;

\- contribute initial-destination semantics;

\- preview best-effort rule;

\- no OCR/AI V1 rule;



unless physical CURRENT reveals a genuine contradiction requiring explicit

Product Truth review.



END OF FREEZE

