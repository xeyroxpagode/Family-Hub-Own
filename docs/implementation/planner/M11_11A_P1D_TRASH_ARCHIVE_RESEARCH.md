# M11 - 11A.P1-D Trash + Archive Research

**MILESTONE:** Planner V1 - 11A.P1 External Comparative Product Research
**WORKTREE:** `C:\Users\thega\Desktop\HomePlus-worktrees\plans`
**BRANCH:** `planner-v1-11a-p1-trash-archive-research`
**BASE:** `1b5dea24f5c0ddfb3b5163dd77be095b05f90876`
**DATE:** 2026-08-02
**SCOPE:** Research only. No code, backend, contracts, Supabase, navigation, UI implementation, package, lockfile, or Product Freeze changes.

---

## 1. Executive Summary

This report investigates how HomePlus should model and present Archive, Trash, Restore, permanent delete, Completed, Closed, and Cancelled for Planner V1 and adjacent modules.

The central finding is that mature products treat these concepts as separate semantic tools:

- **Completed** means the work was done.
- **Closed** means the container, conversation, request, board, or issue is no longer active, without necessarily claiming success.
- **Cancelled** means a planned action or commitment will not occur.
- **Archived** means the user or system preserves an item but removes it from active working views.
- **Trashed / Recently deleted** means the item is in a recoverable deletion state for a limited retention window.
- **Restored** means the item returns from Archive or Trash to an active or reviewable location.
- **Permanent delete** means irreversible removal, usually protected by stronger confirmation, permissions, and audit language.

For HomePlus, the provisional direction is:

- Keep **Archive** and **Trash** visibly separate. Do not reuse Trash UI language for Archive.
- Do not limit Archive automatically to Plans. Offer archive capability entity-by-entity only where the entity has long-lived reference value.
- Use a **global Trash with module filters** as the leading recovery model, but protect private Drafts with owner-only visibility.
- Use **local Archive entry points by module/entity** plus a global or Planner-accessible archive surface only if multiple entities become archivable.
- Exclude archived and trashed content from active Home, Attention, and default Search. Add explicit filters for hidden content.
- Show the 30-day Planner V1 retention only where deletion recovery is relevant, not as a constant alert.
- Treat permanent delete as a candidate to defer or restrict in Planner V1.

This is not a Product Freeze. Recommendations are provisional decision aids.

---

## 2. Internal Baseline

Sources read first:

- `docs/implementation/planner/M11_11A_P0_CURRENT_CAPABILITIES_INVENTORY.md`
- `docs/implementation/planner/M11_11A_P1A_QUICK_ACTIONS_SEARCH_RESEARCH.md`

Verified HomePlus facts:

- Planner Trash is fragmented.
- Tasks, Events, Presets, and Drafts have Restore through Reliability.
- Legacy Goal/Milestone restore remains direct HTTP.
- Inventory uses soft delete but has no Trash UI.
- Archive has partial contract/route/service coverage for Plans, but no archive screen.
- Planner V1 retention is 30 days.
- Drafts are private.
- Cancel is not Trash.
- Archive is not Trash.
- Completed/Closed are not Archive.
- Search should not include hidden content by default without an explicit decision.
- Inventory is less mature than Planner: no capability system, no Reliability queue, no Trash UI, and basic role checks.

Implication: the research must not design Archive as "Plan archive only." The user may decide to archive any entity for which HomePlus offers that capacity, but the capacity should still be evaluated by real entity semantics.

---

## 3. External Comparative Research

Research date: 2026-08-02. Priority was given to official help centers and official product documentation.

### 3.1 Storage and Documents

| Product | Archive pattern | Trash / restore pattern | Permanent delete pattern | HomePlus lesson |
|---|---|---|---|---|
| Google Drive | No general "archive" primary state for Drive files; users organize by location, ownership, and shortcuts. | Trash retains files for 30 days by default; restore returns files when permitted. | "Delete forever" is irreversible for ordinary users. | Trash can be time-boxed and global, but permissions and ownership matter. |
| Dropbox | Files/folders can be removed from active folders and recovered through deleted files. | Deleted files page supports restore, with retention depending on plan. | Permanent delete is separate from ordinary delete. | Recovery belongs in a clear "deleted files" surface, not hidden in normal folders. |
| OneDrive | Archive is mostly user organization, while recycle bin is a distinct system surface. | Recycle bin restores deleted files. Microsoft documents different retention windows for personal vs work/school contexts. | Items removed from recycle bin may be permanently deleted. | Retention can vary by account/module; HomePlus should state Planner V1 policy where it applies. |
| iCloud Drive | No universal archive state; files are active, deleted, or in folders. | Recently Deleted holds recoverable files for about 30 days. | Users can remove before the retention window. | "Recently Deleted" is gentler language for recovery than "Trash" in consumer contexts. |
| Notion | Pages can be moved out of the active structure; workspace search and page hierarchy are central. | Trash contains deleted pages; users can view, search, restore, or permanently delete according to permissions. | Permanent delete is explicit and governed by workspace policy. | Hidden content can be searchable only through an explicit Trash/hidden mode and permission filtering. |
| Box | Trash is a first-class recovery area for deleted content. | Deleted content can be restored under owner/collaborator/admin rules. | Retention and purge behavior can be admin governed. | Collaborative permissions are as important as object state. |

### 3.2 Email and Communication

| Product | Archive pattern | Trash / restore pattern | Permanent delete pattern | HomePlus lesson |
|---|---|---|---|---|
| Gmail | Archive removes a message from Inbox but keeps it in All Mail and search. | Trash retains deleted mail for 30 days. | Empty Trash / delete forever is irreversible for users. | Archive should remove from active views but keep findability. |
| Outlook | Archive is separate from Deleted Items and helps move messages out of Inbox. | Deleted Items and Recoverable Items support recovery depending on policy. | Purge/permanent delete is policy-bound. | Restore can have stages: visible trash first, deeper admin recovery later. |
| Slack | Channels can be archived: closed to new normal activity but retained and searchable according to plan/policy. | Deleting channels/messages is more destructive and permission-restricted. | Deleted channel content may be permanently removed from workspace history. | Closed/archived collaboration spaces can preserve history while stopping work. |
| Discord | Threads auto-archive after inactivity; archived threads can be found and reopened unless locked. | Message/channel deletion is destructive; server permission controls apply. | Deleted content is generally not a user-facing restore workflow. | "Closed/archived" can be reversible and activity-based; delete can be intentionally final. |

### 3.3 Productivity and Projects

| Product | Completed / Closed / Cancelled | Archive pattern | Trash / restore pattern | HomePlus lesson |
|---|---|---|---|---|
| Todoist | Tasks can be completed and later viewed in completed/activity surfaces. | Projects/sections can be removed from active focus by organization, but completion is not archive. | Deleted items rely on limited recovery paths such as activity/backups. | Complete is an accomplishment state, not hiding. |
| TickTick | Tasks support completion, lists, calendar, and deleted/completed views in app patterns. | List organization is separate from completed work. | Deleted task recovery is treated separately from done items. | Users expect completed tasks to remain reviewable without being in Trash. |
| Asana | Tasks can be completed; projects can have statuses and completion/closure semantics. | Projects can be archived to hide from active lists while preserving history. | Deleted items can often be restored for a limited period through product/admin flows. | Project-level archive is valuable because projects carry history and relationships. |
| Trello | Cards can be archived; boards can be closed. Closing a board is not deleting it. | Archived cards leave the active board but remain recoverable. | Deleting cards/boards is separate and often irreversible. | "Close" can mean stop active collaboration; "Archive" can mean hide a card. |
| ClickUp | Statuses distinguish active, done/complete, and closed workflows. | Spaces/folders/lists/tasks can use archive depending on object and workspace model. | Trash stores deleted items for recovery before purge. | Status and object visibility should not be collapsed into one lifecycle flag. |
| Notion | Tasks/databases can use custom statuses, while pages can be moved or deleted. | Page hierarchy and archive-like movement preserve content. | Trash gives a distinct recovery path. | Structured content may need both status fields and lifecycle fields. |
| Microsoft To Do | Completed tasks remain in lists/Completed views. | Archive is not the central user model. | Deleted task/list recovery is tied to Microsoft account/Outlook recovery behavior. | Simple personal task apps avoid Archive unless the object has long-term project value. |
| Jira / Atlassian project tools | Issues have workflow resolutions/statuses such as Done/Closed/Cancelled depending configuration. | Projects/issues can be archived in admin/project contexts. | Deletes are permission-heavy and sometimes irreversible. | Enterprise tools separate workflow state from retention and visibility. |

### 3.4 Content and Media

| Product | Archive pattern | Trash / restore pattern | Permanent delete pattern | HomePlus lesson |
|---|---|---|---|---|
| Google Photos | Archive hides photos from main Photos view but preserves them in albums/search. | Trash retains photos/videos for a limited period, commonly 60 days when backed up. | Empty trash/permanent delete is final. | Archive is a visibility choice; Trash is recovery before deletion. |
| Apple Photos | Hidden and albums are separate from deletion. | Recently Deleted keeps media for about 30 days and shows remaining days. | Delete from Recently Deleted is permanent. | Countdown language is useful in recovery surfaces, not all active surfaces. |
| Instagram | Posts/stories/reels can be archived and restored to profile surfaces. | Recently Deleted lets users review and restore eligible content for a limited period. | Permanent delete requires stronger account/security framing. | Social content shows why Archive can be user-choice preservation, not status. |
| YouTube | No general archive for public videos; users can change visibility to private/unlisted. | Deleted videos are not generally recoverable by the user. | Delete is final and strongly warned. | Some entities should not have Trash if recovery cannot be reliably supported. |

### 3.5 Inventory, Purchases, and Household

| Product | Archive / inactive pattern | Trash / restore pattern | Permanent delete pattern | HomePlus lesson |
|---|---|---|---|---|
| Sortly | Inventory items can be organized, moved, filtered, and sometimes represented as inactive/archived depending plan/workflow. | Deleted inventory recovery is treated as admin/support or trash-like product workflow depending account. | Permanent deletion is risky because inventory records may affect history. | Inventory items may deserve "inactive/discontinued" before Archive/Trash. |
| itemit / asset inventory tools | Assets are often disposed, lost, retired, or archived rather than simply completed. | Deletion is normally permission-heavy because assets have audit trails. | Permanent deletion can damage audit history. | Household inventory may need "removed from household" or "inactive" semantics, not just Archive. |
| Grocy / household inventory patterns | Consumables become depleted/consumed; shopping/restock requests are workflow states. | Deleted products/items are operational cleanup. | Permanent delete should be restricted because history and recipes/shopping links may exist. | Inventory quantity reaching zero is not Cancelled, Completed, Trash, or Archive. |
| Amazon Orders | Orders can be archived from default order history view, but remain accessible. | Orders are not normally deleted by the user. | Permanent delete is not the consumer workflow. | Purchase/history objects often need hide-from-default, not deletion. |

Evidence in this category is weaker than productivity/storage because household inventory products expose less detailed public help. The HomePlus implications are therefore anchored in internal Inventory facts plus common asset/inventory semantics.

---

## 4. Semantic Model

### 4.1 Definitions for HomePlus

| Term | Product meaning | User expectation | Should it remove from active views? | Should it be recoverable? |
|---|---|---|---|---|
| Completed | The intended work was done. | "I finished this." | Usually yes from Open/Mine/Today, no from history. | Reactivate/reopen if allowed; not Restore. |
| Closed | The object or workflow is no longer open. Success is not implied. | "This is no longer active." | Yes from active work queues. | Reopen/reactivate if allowed. |
| Cancelled | The planned thing will not happen. | "We decided not to do this." | Yes from active execution views, but visible in cancelled filters/history. | Reactivate/reschedule if allowed; not Restore. |
| Archived | Preserved but removed from active working surfaces. | "Keep it, but get it out of the way." | Yes by default. | Unarchive/restore from Archive. |
| Trashed | Marked for recoverable deletion. | "I deleted it, but I can still get it back briefly." | Yes from active views. | Restore until retention expires. |
| Restored | Returned from Trash or Archive. | "It is back." | It re-enters active/reviewable surfaces according to its status. | Activity should record restoration. |
| Permanent delete | Irreversible removal/purge. | "This cannot be undone." | Removed everywhere except audit where policy requires. | No ordinary restore. |

### 4.2 Language

Recommended English/Spanish product vocabulary:

- Use **Archive / Archivados** for preserved hidden records.
- Use **Trash / Papelera** or **Recently deleted / Eliminados recientemente** for recoverable deletion. If HomePlus wants a warmer consumer tone, "Eliminados recientemente" can label the screen and "Papelera" can remain the system noun.
- Use **Restore / Restaurar** for Trash and **Unarchive / Desarchivar** for Archive when precision matters.
- Use **Delete permanently / Eliminar definitivamente** for irreversible deletion.
- Use **Complete / Completar**, **Close / Cerrar**, and **Cancel / Cancelar** only for workflow state.

Avoid:

- "Archive" for completed tasks.
- "Trash" for cancelled events.
- "Delete permanently" as a row-level quick action in active Planner surfaces.
- "Restore" without stating whether it restores from Trash or Archive when the source is ambiguous.

### 4.3 Icons

Common patterns:

- Archive: archive box, tray, file box.
- Trash: trash can.
- Restore: counter-clockwise arrow or restore-from-trash icon.
- Permanent delete: trash can plus warning/confirmation, not a casual icon-only action.
- Completed: checkmark.
- Closed: lock, closed circle, or status chip; depends on entity.
- Cancelled: slash, x-circle, cancelled chip.

For HomePlus, iconography should reinforce that Archive is preservation and Trash is deletion recovery.

### 4.4 Confirmations and Visibility

Recommended confirmation strength:

- Complete: no modal; allow undo/reactivate where appropriate.
- Cancel: lightweight confirmation if it affects others or recurring events.
- Archive: usually no heavy confirmation; snackbar undo is enough for low-risk items.
- Move to Trash: confirmation for relationship-heavy objects; otherwise snackbar undo plus retention notice.
- Restore: no heavy confirmation unless restoring dependencies has consequences.
- Permanent delete: modal with item count, retention loss, and irreversible wording; require elevated permission.

Visible states:

- Completed, Closed, Cancelled can appear in filters and detail history.
- Archived should not appear in active lists by default; detail pages may show a banner.
- Trashed should not open as a normal detail by default; it should open in a recovery context with restore/permanent-delete actions.

### 4.5 History

Activity should record:

- Archived.
- Unarchived/restored from archive.
- Moved to Trash.
- Restored from Trash.
- Permanently deleted, when audit policy permits showing a tombstone.
- Completed, closed, cancelled, reactivated.

Activity should avoid leaking private Draft content to household members.

---

## 5. Archive by Entity

Archive is a user-controlled preservation/hiding capability. It should not be granted to every entity merely because it is technically possible.

| Entity | Does Archive make sense? | Who decides? | Active view effect | Preserves | Search | Activity | Attention | Restore/unarchive | Permissions | Children/dependencies | Bulk? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Task | Sometimes. Useful for reference tasks or recurring templates, but Completed/Cancelled usually suffice. | Owner/assignee/coordinator depending task scope. | Hidden from open/today/mine; maybe from done filters unless "archived" filter is on. | Comments, assignment, due history, completion/cancel state. | Excluded default; explicit archived filter. | Yes, if household-visible task. | No, archived tasks should not demand attention. | Unarchive returns to status-appropriate list. | Same or stricter than edit/delete. | Subtasks/checklists stay attached. | Later; not required V1. |
| Event | Rare. Better states are Cancelled or past. Archive may help hide old planning-heavy events. | Creator/coordinator/adult for household event. | Hidden from upcoming/calendar active views. | Attendees, recurrence metadata, notes. | Explicit archived filter only. | Yes. | No upcoming reminders while archived. | Unarchive restores calendar visibility if still valid. | Event edit/cancel-level permission. | Recurrence needs special handling. | Later. |
| Plan | Strong yes. Long-lived plans/projects need preserved history without active clutter. | Plan owner/coordinator or permissioned editor. | Hidden from active Plans and Home plan summaries. | Structure, milestones, tasks/events links, lifecycle state. | Explicit archived filter; result should be labelled. | Yes. | No active attention unless dependency restore problem exists. | Unarchive to Plans; may require dependency review. | Plan archive permission. | Children remain linked but may be hidden as part of plan context. | Useful later; not required V1. |
| Milestone | Sometimes. If milestones are independent visible objects, archive may help; if only plan children, inherit Plan archive. | Plan owner/coordinator. | Hidden from active milestone lists. | Parent plan, completion/closed status. | Via parent plan or explicit archived filter. | Yes if visible collaboration object. | No. | Unarchive child or parent review. | Plan/milestone edit permission. | Parent plan state controls visibility. | Not V1. |
| Preset | Strong yes later. Presets may become obsolete but useful. | Template manager/coordinator. | Hidden from active preset library. | Version/revision history, metadata, usage references. | Explicit library archived filter. | Yes for managers, maybe not household feed. | No. | Unarchive to library. | `planner.templates.manage` equivalent. | Draft revisions remain related. | Useful for managers later. |
| Draft | Usually no global Archive. Drafts are private recovery work; keep autosave/draft recovery and Trash separate. | Draft owner only. | Hidden only from owner draft recovery if archived is offered. | Form state, owner, timestamps. | Owner-only explicit filter if ever allowed. | Owner-only, not household Activity. | Maybe only owner recovery prompt, not global Attention. | Owner unarchives/resumes. | Owner-only. | Source entity/form state may have changed. | No V1. |
| Inventory Item | Maybe, but "inactive/discontinued/removed from household" may fit better than Archive. | Coordinator/adult or item owner depending future permissions. | Hidden from active inventory counts and low-stock alerts. | History, restock links, template relationship. | Explicit hidden/inactive filter. | Yes for household-visible item. | No low-stock alerts while archived/inactive. | Unarchive returns to inventory, maybe quantity review. | Inventory edit/delete-level permission. | Restock requests and Planner tasks need review. | Later if inventory grows. |
| Restock Request | Usually no Archive. Use Approved, Rejected, Cancelled, Closed. | Request owner/coordinator/adult. | Closed/rejected requests leave active request queue. | Request history and linked Planner task. | Search in history only if global Activity/search scope decides. | Yes. | No when closed/cancelled/rejected. | Reopen/reactivate if supported, not unarchive. | Approval/reject permission. | Linked task may exist or be deleted. | Bulk close maybe later. |
| Future entities | Evaluate case by case. | Entity owner or household role. | Hidden from active views. | Relationships and audit. | Explicit filter. | Depends privacy. | Default no. | Unarchive with dependency review. | Entity-specific. | Must preserve referential context. | Only if high volume. |

Provisional rule: Archive is most justified for **Plans** and later **Presets**. It is possible but not automatically justified for Tasks, Events, Milestones, Inventory Items, and future entities. Drafts and Restock Requests should not get generic Archive in Planner V1.

---

## 6. Trash Model

### 6.1 Comparative Patterns

Observed patterns:

- **Global Trash / Deleted files:** Google Drive, Dropbox, OneDrive, Box, Notion.
- **Recently Deleted by media module:** Apple Photos, Google Photos, Instagram.
- **Module trash:** email Trash, Photos Trash, Notion Trash within workspace, Slack/Discord destructive delete with limited user recovery.
- **Retention windows:** common and visible in recovery surfaces.
- **Countdown:** common in media/recently-deleted surfaces; useful when the user is reviewing recovery.
- **Permanent delete / empty trash:** usually separate, confirmation-heavy, and sometimes role/admin restricted.
- **Restore:** returns item to original or best available location, sometimes with fallback when parent no longer exists.
- **Bulk actions:** common in storage/email/media trash; less important for low-volume task apps.

### 6.2 HomePlus Trash Scope

Entities to evaluate:

- Tasks: already trash/restore through Reliability.
- Events: restore exists; trash adapter exists but UI call site is incomplete.
- Plans: should enter Trash if deleted, separate from Archive.
- Presets: trash/restore exists through Reliability.
- Drafts: trash/restore exists through Reliability and must be owner-only.
- Goals/Milestones legacy: restore exists but not Reliability.
- Inventory Items: soft delete exists but no UI restore.

Provisional model:

- One **global Trash surface** for recoverable deletion, with filters by module/entity.
- Private Drafts appear only to the owner.
- Legacy Goal/Milestone entries can appear but should be labelled as legacy until Reliability is aligned.
- Inventory soft-deleted items should not silently enter global Trash until restore semantics and permissions are defined.

### 6.3 Trash Behaviors

| Concern | Recommendation for Planner V1 |
|---|---|
| Global vs module | Prefer global Trash with module filters, because users remember "I deleted something" more than the module-specific screen. |
| Single vs multiple papeleras | One global Trash, but allow local entry points from Planner/Inventory to pre-filter. |
| Recently deleted label | Use "Papelera" in navigation; screen title can include "Eliminados recientemente" if tone testing favors it. |
| Retention | Show "30 dias" and countdown/date in Trash rows. |
| Restore | Primary row action; no heavy confirmation unless dependencies changed. |
| Permanent delete | Defer or restrict; if included, require confirmation and permission. |
| Empty trash | Not required for V1; high-risk and bulk destructive. |
| Bulk restore | Optional later; not required for V1. |
| Bulk permanent delete | Avoid V1. |
| Ordering | Most recently trashed first; allow filter by module/entity. |
| Search | Search within Trash, not default global Search. |
| Dependencies | Restore should explain missing parent, recreated entity, or permission change. |
| Linked objects | Restore parent with children by default only when relationship ownership is clear. |

### 6.4 Entity-Specific Trash

| Entity | Trash fit | Restore principle | Special risk |
|---|---|---|---|
| Task | Strong. | Restore to previous status and assignment, unless parent/plan missing. | Due dates may be stale; completed/cancelled status should not be lost. |
| Event | Strong but recurrence-aware. | Restore event or occurrence; show recurrence scope when relevant. | Past/upcoming calendar implications. |
| Plan | Strong for accidental deletion; Archive remains separate. | Restore plan graph with children or restore as "needs review" if dependencies missing. | Partial graph restore complexity. |
| Preset | Strong for template mistakes. | Restore to library if user can manage templates. | Name/version collisions. |
| Draft | Strong but owner-only. | Restore/resume private draft. | Privacy leakage. |
| Goal/Milestone legacy | Existing but fragile. | Restore with legacy label or route through future Reliability work. | Inconsistent mutation reliability. |
| Inventory Item | Candidate. | Restore item to inventory but require quantity/low-stock review if stale. | Soft delete exists without product recovery semantics. |

---

## 7. Surface and Navigation

### 7.1 Options Compared

| Option | Description | Discoverability | Clarity | Privacy | Growth | Technical cost | Phone/tablet fit |
|---|---|---|---|---|---|---|---|
| A | One screen with tabs: Trash \| Archived | High if in More/Planner. | Medium: may imply Archive and Trash are peers. | Needs careful private Draft filtering. | Good. | Medium. | Good on phone; split/tabs on tablet. |
| B | Separate screens | Medium. | High: Archive and Trash are distinct. | Easier. | Good but more navigation. | Medium. | Good if entries are named clearly. |
| C | Surfaces inside each module | Low global recovery. | High local context. | Easier per module. | Fragmentation risk. | Lower initially. | Fine but recovery is harder. |
| D | Global surface with filters by module | High. | High for Trash, medium for Archive. | Needs strict filtering. | Strong. | Higher. | Good; filters become sidebar on tablet. |
| E | Local Archive by module + global Trash | High for recovery, high semantic clarity. | Strong. | Best balance. | Strong. | Medium. | Strong phone/tablet fit. |

### 7.2 Provisional Recommendation

**Recommendation provisional:** Option E.

- Global Trash accessible from More and from Planner overflow.
- Module-local Archive first, starting with Plan archive if chosen, and future entity archives exposed near each entity's module/library.
- If multiple archive-capable entities emerge, add a global "Archived" surface or a HomePlus hidden-content surface later.

Reasoning:

- Users need one place to recover deleted things.
- Archive is a more intentional, entity-specific organization action.
- Private Drafts are easier to protect when global Trash filters by owner.
- Inventory can later contribute to Trash without forcing Archive semantics.

### 7.3 Navigation Entry Points

- More: `Papelera` global recovery.
- Planner overflow: `Papelera` opens global Trash pre-filtered to Planner; `Archivados` opens Planner archive/Plan archive if implemented.
- Inventory: future `Eliminados` or global Trash pre-filtered to Inventory only after restore rules exist.
- Entity detail overflow: `Archive`, `Move to Trash`, `Restore`, `Unarchive` depending lifecycle source.
- Tablet: left filter rail for module/entity/status; detail pane for selected deleted/archived item.
- Phone: full-screen list with filter chips and row actions.

---

## 8. Search, Home, Attention, and Activity

### 8.1 Search

External pattern:

- Archive often remains searchable with explicit label or in all-mail/history contexts.
- Trash is usually excluded from default search, but searchable inside Trash or through explicit filters.
- Permission checks happen before display.

HomePlus recommendation:

- Default global Search excludes archived and trashed content.
- Add explicit filters later: `Incluir archivados`, `Buscar en Papelera`, or hidden-content scope.
- Archived results, when included, must show an "Archivado" chip.
- Trashed results should open in recovery context, not normal detail.
- Drafts are owner-only and should not appear in household search by default.

### 8.2 Home

External pattern:

- Active dashboards exclude archived/deleted content.
- Recovery access is usually in navigation/settings, not constantly promoted.

HomePlus recommendation:

- Exclude archived and trashed items from Home summaries.
- Do not show permanent Trash alerts on Home.
- Home may show a temporary "Restored recently" or undo snackbar only immediately after action.
- Home may show attention only if a restoration problem blocks an active workflow.

### 8.3 Attention

External pattern:

- Trash countdowns are visible in recovery surfaces, not always pushed as notifications.
- Admin/security apps may alert on destructive actions, but consumer productivity apps are quieter.

HomePlus recommendation:

- Do not make Trash a constant Attention source.
- Attention can include exceptional cases only:
  - item expires soon and user is currently in recovery context;
  - restore failed because parent/dependency is missing;
  - restore blocked by permissions;
  - private Draft recovery for owner only, if product chooses.
- Archived items should not generate Attention.

### 8.4 Activity

External pattern:

- Collaboration tools log archival, deletion, restoration, and status changes.
- Some products retain audit tombstones even when content is purged.

HomePlus recommendation:

- Log: archived, unarchived, moved to Trash, restored from Trash, permanent delete, completed, closed, cancelled, reactivated.
- Activity rows should use safe labels and avoid sensitive Draft content.
- Permanent delete may leave an audit row without opening a detail page.
- Activity is a history surface, not a recovery surface.

---

## 9. Privacy and Permissions

### 9.1 Privacy Rules

HomePlus has household and personal/private content. Drafts are owner-only.

Recommended rules:

- Drafts in Trash are visible only to the owner.
- Household entities in Trash are visible to users who could otherwise view or manage that entity, subject to role rules.
- Personal tasks/events should not appear to other household members only because Trash is global.
- Switching households must reset hidden-content filters and result caches.
- Search/Activity must filter by household and personal scope before ranking or grouping.
- Sensitive deleted content should use redacted row labels if audit must remain visible to other roles.

### 9.2 Roles

Suggested permission posture:

| Action | Coordinator | Adult | Minor | Owner |
|---|---|---|---|---|
| View global Trash | Yes for household scope. | Yes if household policy allows. | Limited or no household Trash. | Yes for own personal/Drafts. |
| Restore household item | Yes. | Yes for allowed entity types. | Own items only if allowed. | Own personal items. |
| Archive household item | Yes. | Yes for allowed entity types. | Usually no or own-only. | Own personal items. |
| Permanent delete | Coordinator only or deferred. | Possibly no in V1. | No. | Own private Draft only if product allows. |
| View Drafts in Trash | Own only. | Own only. | Own only. | Own only. |

### 9.3 Permanent Delete in Planner V1

Recommendation provisional: **defer permanent delete or restrict it heavily**.

Reasons:

- Planner V1 already has 30-day retention, enough for most accidental deletion recovery.
- Permanent delete introduces irreversible behavior, permissions, audit, dependency, and privacy complexity.
- "Empty Trash" is not necessary for core household planning.
- If permanent delete is required, limit to coordinator/admin and private owner-only Drafts, with strong confirmation.

---

## 10. Restore and Relationships

Restore is a UX promise before it is a technical contract: the user expects the item to come back in an understandable state, or to be told why it cannot.

| Case | UX principle |
|---|---|
| Restore child without parent | Offer restore into original parent if available; otherwise restore to a safe holding state and explain that parent is missing. |
| Restore Plan with dependencies | Restore the plan graph when possible; if linked tasks/events were deleted separately, show a review step. |
| Restore recurring Event | Ask whether restoring the series or one occurrence is intended when the trash entry represents an occurrence override. |
| Restore assigned Task | Preserve assignee/status; show stale due date or missing assignee warning if roles changed. |
| Restore Preset | Restore to library with collision handling if a preset with the same name exists. |
| Restore Draft | Owner-only; resume or restore to draft recovery, not active household surfaces. |
| Restore Inventory Item | Restore to inventory with quantity/low-stock review; do not auto-generate restock alerts until item is active. |
| Name collision | Keep original name and add disambiguating suffix or ask user in restore review for high-value objects. |
| Entity recreated | Treat as separate object; do not merge automatically. |
| Permissions modified | Block or request elevated permission; explain who can restore. |
| Household nonexistent | Cannot restore into missing household; show expired/unavailable state. |
| Retention expired | Show that restore is no longer available; avoid promising recovery. |

Restore result labels:

- `Restaurado a Tareas`
- `Restaurado como borrador`
- `Restaurado, revisar dependencias`
- `No se puede restaurar: permiso insuficiente`
- `No se puede restaurar: vencio el periodo de 30 dias`

---

## 11. Bulk Actions

External products commonly support selection, bulk restore, empty trash, and permanent delete in storage/email/media surfaces. Productivity apps often delay bulk destructive actions unless volume is high.

### 11.1 HomePlus V1 Need

| Bulk action | V1 need | Recommendation |
|---|---|---|
| Select several in Trash | Low-medium. | Defer unless Trash volume is high. |
| Restore several | Medium later. | Useful after global Trash stabilizes. |
| Archive several | Low for V1. | Defer; bulk archive can hide too much accidentally. |
| Empty Trash | Low. | Avoid V1. |
| Permanent delete several | Low and high-risk. | Avoid V1. |
| Bulk permanent delete with mixed permissions | Very high complexity. | Avoid. |
| Progress/partial failure | Needed only if bulk ships. | Defer with bulk. |

### 11.2 Confirmation Rules

If bulk actions ship later:

- Show selected count and entity types.
- Split mixed permission results before mutation.
- For restore, allow partial success with clear failure reasons.
- For permanent delete, require a stronger confirmation and do not combine with restore in the same action bar.
- Use progress state for large selections.

---

## 12. HomePlus Architecture Alternatives

All recommendations are provisional.

### Architecture A - Global Trash + Local Archive

Location:

- More -> Papelera.
- Planner overflow -> Papelera filtered to Planner.
- Plan/Planner archive lives in Planner/Plans surfaces.
- Future Inventory Trash entry opens global Trash filtered to Inventory.

Separation:

- Trash is global and recoverable deletion.
- Archive is local to entity/module until multiple modules justify a global archive.

Modules/entities:

- Trash: Tasks, Events, Plans, Presets, Drafts owner-only, legacy Goals/Milestones, later Inventory Items.
- Archive: Plans first if chosen; Presets later; others only by decision.

Filters:

- Module, entity, trashed date, owner/scope, expires soon.

Restore:

- Primary row action; dependency review when needed.

Retention:

- 30-day countdown/date in Trash rows.

Privacy:

- Draft owner-only; personal content filtered before display.

Search:

- Default Search excludes hidden content. Trash has local search.

Activity:

- Logs archive/trash/restore/permanent delete with privacy-safe labels.

Attention:

- Only exceptional restore/dependency issues.

Bulk:

- Defer V1.

Permanent delete:

- Defer or coordinator-only.

Phone:

```text
More
  Papelera

Papelera
[Todos] [Planner] [Inventario] [Borradores]
Buscar en papelera
Task row        27 dias   Restaurar
Event row       12 dias   Restaurar
Draft row       Privado   Restaurar
```

Tablet:

```text
Papelera
Filters rail        Deleted item list        Recovery detail
Module              Task row                 Title
Entity              Event row                Metadata
Expires             Draft row                Restore / Delete permanently
```

Advantages:

- Best match for user recovery behavior.
- Keeps Archive semantically clean.
- Scales without forcing all modules into Archive.
- Protects Drafts with filter/ownership rules.

Disadvantages:

- Requires global Trash navigation/product policy.
- Archive discovery is weaker until multiple archive-capable entities exist.

Risks:

- Global Trash can accidentally expose private content if filtering is wrong.
- Inventory restore cannot be added until semantics are defined.

### Architecture B - One Hidden Content Surface: Trash | Archived

Location:

- More -> Hidden content.
- Planner overflow -> Hidden content filtered to Planner.

Separation:

- One screen with tabs `Papelera` and `Archivados`.

Modules/entities:

- Trash includes recoverable deletes.
- Archive includes every entity with archive capability.

Filters:

- Module/entity/status/date; Archive tab also filters by archived-by.

Restore:

- Trash uses `Restaurar`.
- Archive uses `Desarchivar`.

Retention:

- Only Trash tab shows countdown.

Privacy:

- Drafts owner-only; archived personal content owner-only.

Search:

- Local search within each tab.

Activity:

- Logs both hidden-state categories.

Attention:

- No default alerts; only dependency/expiry edge cases.

Bulk:

- Maybe restore/unarchive later.

Permanent delete:

- Only Trash tab, restricted.

Phone:

```text
Ocultos
[Papelera] [Archivados]
[Todos] [Tareas] [Eventos] [Planes]
Row
Row
```

Tablet:

```text
Hidden content
Tabs top: Papelera | Archivados
Left filters | Middle list | Right detail
```

Advantages:

- High discoverability for both concepts.
- One place for hidden content.

Disadvantages:

- May blur Archive and Trash as equally destructive.
- Heavier for Planner V1 if Archive only starts with Plans.

Risks:

- Users may restore/delete from wrong mental model if labels are not strong.

### Architecture C - Module-Scoped Trash and Archive

Location:

- Planner -> Papelera, Planner -> Archivados.
- Inventory -> Eliminados.
- Presets/Drafts keep local surfaces.

Separation:

- Every module owns its lifecycle surfaces.

Modules/entities:

- Planner objects in Planner.
- Inventory objects in Inventory.
- Drafts owner-only in Draft Recovery/Trash.

Filters:

- Mostly local.

Restore:

- Module-specific restore.

Retention:

- Shown in each module.

Privacy:

- Easier because module context is narrower.

Search:

- Local hidden-content search only.

Activity:

- Global Activity can still log lifecycle actions.

Attention:

- Local only.

Bulk:

- Module by module later.

Permanent delete:

- Module-specific and restricted.

Phone:

```text
Planner
  ...
  Papelera
  Archivados

Inventory
  ...
  Eliminados
```

Tablet:

```text
Planner hidden content
Filters | List | Detail
```

Advantages:

- Lower initial integration cost.
- Clear local permissions.
- Good if hidden content remains low volume.

Disadvantages:

- Recovery is fragmented, matching the current problem.
- Users must remember where an item was deleted.

Risks:

- Presets/Drafts/Planner/Inventory remain inconsistent.

### Architecture D - Global Recovery Center

Location:

- More -> Recovery.
- Header/search can link to Recovery for hidden content.

Separation:

- Recovery center contains Trash, Archived, Restore problems, and recent restores.

Modules/entities:

- All modules eventually participate.

Filters:

- Module, entity, lifecycle source, privacy scope, expiry, blocked restores.

Restore:

- Central restore workflow with dependency review.

Retention:

- Countdown, expiry filters, retention policy explainer.

Privacy:

- Strongest filtering requirements.

Search:

- Search hidden content inside Recovery.

Activity:

- Integrated timeline panel.

Attention:

- Recovery problems can surface here instead of global Attention.

Bulk:

- Full bulk selection later.

Permanent delete:

- Restricted; perhaps admin/coordinator only.

Phone:

```text
Recovery
[Papelera] [Archivados] [Problemas]
Buscar
Filters
Rows
```

Tablet:

```text
Recovery Center
Left nav: Trash / Archive / Problems / Recent restores
Middle list
Right detail + relationship review
```

Advantages:

- Most scalable long-term.
- Handles dependency restore and audit visibly.

Disadvantages:

- Too large for Planner V1 unless hidden-content volume is high.
- Higher technical/product cost.

Risks:

- Overbuilds before Search, Activity, Attention, and permissions are mature.

---

## 13. Entity Matrix

Legend:

- `Yes`: product capability makes semantic sense.
- `Maybe`: requires explicit user/product decision.
- `No`: not recommended as generic capability.
- `Existing`: already present internally in some form.
- `Explicit`: only through explicit hidden-content filter/surface.

| Entity | Completed | Closed | Cancelled | Archive | Trash | Restore | Permanent delete | Ownership | Permissions | Relationships | Search | Home | Attention | Activity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Task | Yes | Maybe/reopen | Yes | Maybe | Existing | Existing | Defer/restrict | Household or personal owner/assignee | Complete/cancel/trash by capability | Plan/event links, assignee, subtasks | Default active only; hidden explicit | Active only | Active overdue/verify only | Yes |
| Event | No | Maybe for past/closed workflow | Yes | Maybe/rare | Existing adapter | Existing | Defer/restrict | Creator/household | Event edit/cancel/trash | Recurrence, attendees | Active/upcoming only; hidden explicit | Upcoming only | Active reminders only | Yes |
| Plan | Maybe via lifecycle | Yes | Maybe | Strong yes | Candidate/yes if delete exists | Candidate/yes | Defer/restrict | Owner/coordinator | Plan manage/archive/delete | Tasks, events, milestones | Active default; archive explicit | Active summaries only | Active blockers only | Yes |
| Milestone | Yes | Yes | Maybe | Maybe/inherit plan | Existing legacy | Existing legacy | Defer/restrict | Plan owner/coordinator | Plan/milestone manage | Parent plan | Via plan/default active | Active plan only | Active blockers only | Yes |
| Preset | No | Maybe retire | No | Strong later | Existing | Existing | Restrict manager | Template manager | `planner.templates.manage` equivalent | Draft revisions/usage | Library active only; archive explicit | No | No | Manager/activity only |
| Draft | No | No | Cancel/discard | No generic | Existing | Existing | Owner-only/defer | Owner only | Owner only | Source form/entity may change | Owner-only explicit | No | Owner-only recovery if chosen | Owner-only/no household leak |
| Inventory Item | No | Maybe inactive/removed | No | Maybe, but inactive may be better | Soft delete exists | Missing UI | Defer/restrict | Household item creator/role | Future inventory manage | Restock requests, Planner tasks | Active only; hidden explicit later | Active stock only | Active low/out-of-stock only | Yes if household-visible |
| Restock Request | No | Yes | Yes/reject | No | Maybe cleanup only | Reopen maybe, not restore | Defer/restrict | Requester/household | Coordinator/adult for approve/reject | Inventory item, Planner task | History explicit only | Active pending only | Pending only | Yes |
| Future entity | Depends | Depends | Depends | Depends on reference value | Depends | Depends | Defer until policy exists | Entity owner/scope | Entity-specific | Preserve links | Hidden explicit | Active only | Active only | Entity-specific |

---

## 14. Decisions for the User

Maximum 10 decisions. Each recommendation is provisional.

### TRASH-01 - Global Trash or module Trash

Options:

- A. Global Trash with module/entity filters.
- B. Separate Trash per module.
- C. Keep current fragmented Planner/Presets/Drafts trash.

Recommendation provisional: A.

Consequences:

- A gives the clearest recovery model but needs strict privacy filtering.
- B is simpler locally but makes recovery harder.
- C preserves current inconsistency.

### ARCH-01 - Archive surface model

Options:

- A. Local Archive per entity/module, starting where Archive is semantically strong.
- B. Global Archived screen now.
- C. One combined `Papelera | Archivados` screen.

Recommendation provisional: A, with C as later option if multiple archive-capable entities ship.

Consequences:

- A avoids overbuilding and keeps Archive contextual.
- B improves discovery but may be premature.
- C is convenient but risks confusing Archive with deletion.

### ARCH-02 - Initially archivable entities

Options:

- A. Plans only at first.
- B. Plans and Presets.
- C. Plans, Presets, Tasks, Events, Inventory Items.
- D. Any entity technically capable of archive.

Recommendation provisional: A for V1, evaluate B next. Do not assume Archive is only for Plans forever.

Consequences:

- A aligns with current partial route/service and plan semantics.
- B adds useful template retirement but requires library UX.
- C/D risk hiding operational entities that have better statuses.

### DELETE-01 - Permanent delete in Planner V1

Options:

- A. Defer permanent delete.
- B. Coordinator-only permanent delete.
- C. Owner-only for private Drafts, coordinator-only for household content.
- D. Full permanent delete and empty-trash support.

Recommendation provisional: A or C if storage/privacy requires it.

Consequences:

- A is safest and relies on 30-day retention.
- C handles private Draft cleanup but adds policy complexity.
- D is high-risk and unnecessary for recovery MVP.

### SEARCH-HIDDEN-01 - Hidden content in Search

Options:

- A. Exclude Archive/Trash by default; explicit filters only.
- B. Include accessible archived content by default.
- C. Include Trash by default.
- D. Never search hidden content.

Recommendation provisional: A.

Consequences:

- A balances safety and recoverability.
- B can surprise users with stale records.
- C is risky and noisy.
- D makes recovery harder.

### RETENTION-01 - Presenting 30-day retention

Options:

- A. Show countdown/date only in Trash rows/detail.
- B. Show global alerts for expiring Trash.
- C. Hide retention until restore fails.
- D. Show retention in every deleted-item snackbar and row.

Recommendation provisional: A, with D only for the initial delete snackbar if copy remains short.

Consequences:

- A is clear without creating attention fatigue.
- B over-alerts.
- C feels unfair.
- D may be noisy.

### PRIVACY-01 - Drafts in Trash/Recovery

Options:

- A. Owner-only Draft visibility and restore.
- B. Household coordinators can see Draft metadata.
- C. Drafts excluded from global Trash.

Recommendation provisional: A.

Consequences:

- A preserves recovery and privacy.
- B risks leaking private planning.
- C keeps privacy simple but fragments recovery.

### RESTORE-01 - Dependency restore handling

Options:

- A. Restore if clean; otherwise show review/problem state.
- B. Restore everything recursively without review.
- C. Block restore whenever any dependency changed.

Recommendation provisional: A.

Consequences:

- A is understandable and resilient.
- B can recreate unwanted hidden/deleted children.
- C is too brittle.

### BULK-01 - Bulk hidden-content actions

Options:

- A. No bulk actions in V1.
- B. Bulk restore only.
- C. Bulk restore and bulk archive.
- D. Full selection, restore, archive, empty trash, permanent delete.

Recommendation provisional: A for V1, B later if volume requires it.

Consequences:

- A reduces accidental mass changes.
- B helps recovery without high destructive risk.
- D needs complex partial failure and permission UI.

### ACTIVITY-01 - Activity/audit visibility

Options:

- A. Log lifecycle events with privacy-safe labels.
- B. Do not log archive/trash/restore.
- C. Full audit details visible to all household adults.

Recommendation provisional: A.

Consequences:

- A supports household accountability without leaking private Drafts.
- B makes recovery and coordination opaque.
- C may overexpose sensitive content.

---

## 15. Provisional Recommendation

Recommended direction for discussion:

1. Adopt **Architecture A: Global Trash + Local Archive**.
2. Use a single global Trash with filters for Planner, Presets/Drafts, legacy Goals/Milestones, and later Inventory.
3. Keep Drafts owner-only inside any global recovery surface.
4. Start Archive with Plans only if V1 needs it, but explicitly leave room for Presets and other future entities by decision.
5. Keep Archive, Trash, Completed, Closed, and Cancelled as separate semantic states/actions.
6. Exclude hidden content from default Search, Home, and Attention.
7. Log lifecycle actions in Activity with privacy filtering.
8. Defer bulk actions and permanent delete unless a concrete product need overrides the risk.

---

## 16. Bibliography

Official or primary sources consulted on 2026-08-02:

- Google Drive Help, delete and restore files: https://support.google.com/drive/answer/2375102
- Google Drive Help, find or recover a file: https://support.google.com/drive/answer/1716222
- Dropbox Help, recover and restore deleted files or folders: https://help.dropbox.com/delete-restore/recover-deleted-files-folders
- Dropbox Help, permanently delete files or folders: https://help.dropbox.com/delete-restore/permanently-delete
- Microsoft Support, restore deleted files or folders in OneDrive: https://support.microsoft.com/en-us/office/restore-deleted-files-or-folders-in-onedrive-949ada80-0026-4db3-a953-c99083e6a84f
- Microsoft Support, restore your OneDrive: https://support.microsoft.com/en-us/office/restore-your-onedrive-fa231298-759d-41cf-bcd0-25ac53eb8a15
- Apple iCloud User Guide, delete and recover files in iCloud Drive: https://support.apple.com/guide/icloud/delete-and-recover-files-mm2f42f05cb9/icloud
- Notion Help, duplicate, delete and restore content: https://www.notion.com/help/duplicate-delete-and-restore-content
- Notion Help, search in workspace: https://www.notion.com/help/search
- Box Support, managing trash: https://support.box.com/hc/en-us/articles/360044196093-Managing-Trash
- Gmail Help, archive or mute Gmail messages: https://support.google.com/mail/answer/6576
- Gmail Help, delete or recover deleted Gmail messages: https://support.google.com/mail/answer/7401
- Microsoft Support, archive in Outlook: https://support.microsoft.com/en-us/office/archive-in-outlook-for-windows-25f75777-3cdc-4c77-9783-5929c7b47028
- Microsoft Support, recover deleted items in Outlook: https://support.microsoft.com/en-us/office/recover-deleted-items-in-outlook-for-windows-49e81f3c-c8f4-4426-a0b9-c0fd751d48ce
- Slack Help, archive or delete a channel: https://slack.com/help/articles/213185307-Archive-or-delete-a-channel
- Slack Help, retention settings and deletion: https://slack.com/help/articles/203457187-Customize-message-and-file-retention
- Discord Support, threads FAQ: https://support.discord.com/hc/en-us/articles/4403205878423-Threads-FAQ
- Discord Support, permissions: https://support.discord.com/hc/en-us/articles/206029707-Setting-Up-Permissions-FAQ
- Todoist Help, complete or uncomplete a task: https://todoist.com/help/articles/complete-or-uncomplete-a-task-in-todoist-WNISqP
- Todoist Help, delete a task: https://todoist.com/help/articles/delete-a-task-in-todoist-1SIZ0p
- Todoist Help, view completed tasks: https://todoist.com/help/articles/view-completed-tasks-in-todoist-1f4tF5
- TickTick Help, complete tasks and deleted tasks: https://help.ticktick.com/
- Asana Help, archive or delete a project: https://help.asana.com/s/article/archive-or-delete-a-project
- Asana Help, task actions and completion: https://help.asana.com/
- Trello Support, archiving and deleting cards: https://support.atlassian.com/trello/docs/archiving-and-deleting-cards/
- Trello Support, closing and deleting boards: https://support.atlassian.com/trello/docs/closing-a-board/
- ClickUp Help, statuses: https://help.clickup.com/hc/en-us/articles/6309452618647-Intro-to-statuses
- ClickUp Help, Trash: https://help.clickup.com/hc/en-us/articles/6311643334935-Trash
- Microsoft To Do Support: https://support.microsoft.com/en-us/todo
- Atlassian Support, archive a project in Jira: https://support.atlassian.com/jira-cloud-administration/docs/archive-a-project/
- Google Photos Help, delete and restore photos and videos: https://support.google.com/photos/answer/6128858
- Apple iPhone User Guide, delete or hide photos and videos: https://support.apple.com/guide/iphone/delete-or-hide-photos-and-videos-iph961b96c4d/ios
- Instagram Help, delete, archive, and restore content: https://help.instagram.com/
- YouTube Help, replace or delete your video: https://support.google.com/youtube/answer/55770
- Sortly Help Center: https://help.sortly.com/
- itemit Help Center: https://itemit.zendesk.com/hc/en-us
- Grocy documentation: https://grocy.info/
- Amazon Help, archive orders: https://www.amazon.com/gp/help/customer/display.html?nodeId=G6E3B2E8QPHQ88KF

---

## 17. Validation

Created only:

```text
docs/implementation/planner/M11_11A_P1D_TRASH_ARCHIVE_RESEARCH.md
```

No code, backend, contracts, navigation, UI, Supabase, package, or lockfile changes.

---

HANDOFF PARA CONTROL GENERAL

LANE: Planner V1 - 11A.P1-D External Comparative Research
MILESTONE: Planner V1 - 11A.P1 External Comparative Product Research
BRANCH: `planner-v1-11a-p1-trash-archive-research`
WORKTREE: `C:\Users\thega\Desktop\HomePlus-worktrees\plans`
BASE: `1b5dea24f5c0ddfb3b5163dd77be095b05f90876`
VERDICT: PLANNER_TRASH_ARCHIVE_RESEARCH_COMPLETE
COMMIT: pending
BLOCKERS: None
RISKS: Hidden-content global surfaces can leak private Drafts or personal household content if permission filtering is not product-defined before implementation. Permanent delete and bulk actions add irreversible-action risk and should be deferred or restricted. Inventory soft delete should not be surfaced in global Trash until restore semantics are defined.
INTEGRATION REQUESTS: None for this research phase.
SUPABASE: No changes.
FILES CHANGED:

- `docs/implementation/planner/M11_11A_P1D_TRASH_ARCHIVE_RESEARCH.md`

NEXT ACTION: User should decide TRASH-01, ARCH-01, ARCH-02, DELETE-01, SEARCH-HIDDEN-01, RETENTION-01, PRIVACY-01, RESTORE-01, BULK-01, and ACTIVITY-01 before any P2 implementation planning.
