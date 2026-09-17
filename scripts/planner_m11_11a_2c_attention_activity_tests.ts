import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Test = { name: string; run: () => void };

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const files = {
  routes: read('backend/src/routes/planner.js'),
  attentionService: read('backend/src/services/planner.attention.service.js'),
  attentionController: read('backend/src/controllers/planner.attention.controller.js'),
  activityController: read('backend/src/controllers/planner.activity.controller.js'),
  homeTabs: read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx'),
  navContract: read('front/mi-front-limpio/navigation/plannerNavigationContract.ts'),
  navTypes: read('front/mi-front-limpio/navigation/types.ts'),
  globalSurfaces: read('front/mi-front-limpio/services/planner/globalSurfaceTypes.ts'),
  screen: read('front/mi-front-limpio/screens/planner/PlannerAttentionActivityScreen.tsx'),
  attentionClient: read('front/mi-front-limpio/services/planner/plannerAttentionClient.ts'),
  activityClient: read('front/mi-front-limpio/services/planner/plannerActivityClient.ts'),
  attentionTypes: read('front/mi-front-limpio/services/planner/plannerAttention.ts'),
  activityTypes: read('front/mi-front-limpio/services/planner/plannerActivity.ts'),
  appTopBar: read('front/mi-front-limpio/components/ui/AppTopBar.tsx'),
  quickActions: read('front/mi-front-limpio/services/planner/plannerQuickActions.ts'),
};

let passed = 0;
let failed = 0;

function check(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function has(file: string, text: string): boolean {
  return file.includes(text);
}

function notHas(file: string, text: string): boolean {
  return !file.includes(text);
}

const tests: Test[] = [
  { name: 'route exposes GET /attention', run: () => check(has(files.routes, "router.get('/attention', attentionController.getAttention)"), 'missing attention route') },
  { name: 'route keeps GET /activity', run: () => check(has(files.routes, "router.get('/activity', activityController.listActivity)"), 'missing activity route') },
  { name: 'attention controller enforces planner.view', run: () => check(has(files.attentionController, "assertCapability(capabilities, 'planner.view')"), 'attention controller lacks planner.view') },
  { name: 'activity controller enforces planner.view', run: () => check(has(files.activityController, "assertCapability(capabilities, 'planner.view')"), 'activity controller lacks planner.view') },
  { name: 'attention projection version exists', run: () => check(has(files.attentionService, 'planner.global_attention.v1'), 'missing attention projection') },
  { name: 'activity projection version exists', run: () => check(has(files.activityController, 'planner.global_activity.v1'), 'missing activity projection') },
  { name: 'attention count/list share items projection', run: () => check(has(files.attentionService, 'total: trimmed.length') && has(files.attentionService, 'items: trimmed'), 'count/list parity not visible') },
  { name: 'attention dedupe by reason/entity/person', run: () => check(has(files.attentionService, 'item.reason') && has(files.attentionService, 'item.entityType') && has(files.attentionService, 'item.personRecipientId'), 'missing dedupe tuple') },
  { name: 'attention stable ID includes reason/entity/person', run: () => check(has(files.attentionService, 'attn:${reason}:${entityType}:${entityId}:${personId}'), 'attention stable ID missing') },
  { name: 'attention priority sorts severity then recency', run: () => check(has(files.attentionService, 'severityRank(a.reason)') && has(files.attentionService, 'bTime.localeCompare(aTime)'), 'priority ordering missing') },
  { name: 'attention privacy applies before DTO', run: () => check(has(files.attentionService, 'isVisibleInPlannerContext(toVisibilityInput') && has(files.attentionService, 'buildPlannerAccessContext'), 'privacy filter missing') },
  { name: 'attention uses task verification source', run: () => check(has(files.attentionService, 'awaiting_verification'), 'missing verification source') },
  { name: 'attention uses task correction source', run: () => check(has(files.attentionService, 'correction_requested'), 'missing correction source') },
  { name: 'attention uses RSVP source', run: () => check(has(files.attentionService, 'planner_event_participants') && has(files.attentionService, 'rsvp_status'), 'missing RSVP source') },
  { name: 'attention uses plan blocker source', run: () => check(has(files.attentionService, "eq('lifecycle', 'blocked')"), 'missing plan blocker source') },
  { name: 'attention excludes cancelled tasks/events', run: () => check(has(files.attentionService, ".neq('status', 'cancelled')"), 'cancelled filter missing') },
  { name: 'attention excludes trash', run: () => check(has(files.attentionService, ".is('trashed_at', null)"), 'trash filter missing') },
  { name: 'attention excludes archived plans', run: () => check(has(files.attentionService, ".is('archived_at', null)"), 'archive filter missing') },
  { name: 'attention correction targets current member', run: () => check(has(files.attentionService, 'f.responsible_member_id !== context.membershipId'), 'correction recipient filter missing') },
  { name: 'attention rows have at most one primary action field', run: () => check(has(files.attentionTypes, 'primaryAction: AttentionPrimaryAction | null'), 'primary action not nullable singleton') },
  { name: 'attention destination is canonical', run: () => check(has(files.attentionTypes, "surfaceOrigin: 'attention'") && has(files.screen, 'openEntityDetail'), 'attention destination missing') },
  { name: 'attention opening does not mutate', run: () => check(notHas(files.screen, 'markAsRead') && notHas(files.screen, 'resolvedAt') && notHas(files.screen, 'dismiss'), 'read/open resolution found') },
  { name: 'attention primary action opens canonical detail', run: () => check(has(files.screen, 'onPrimaryAction={handleOpenAttention}') || has(files.screen, 'onPrimaryAction={handleOpenAttention}'), 'primary action is not detail-backed') },
  { name: 'activity filters technical noise', run: () => check(has(files.activityController, 'NOISE_MARKERS') && has(files.activityController, 'isNoiseAction'), 'technical noise filtering missing') },
  { name: 'activity excludes navigation noise', run: () => check(has(files.activityController, 'route_visit') && has(files.activityController, 'screen_open') && has(files.activityController, 'search_query'), 'navigation noise filters missing') },
  { name: 'activity is read-only client', run: () => check(has(files.activityClient, 'OPERATION_KINDS.READ_ONLY'), 'activity client not read-only') },
  { name: 'attention is read-only client', run: () => check(has(files.attentionClient, 'OPERATION_KINDS.READ_ONLY'), 'attention client not read-only') },
  { name: 'activity has no unread contract', run: () => check(notHas(files.activityTypes, 'readAt') && notHas(files.activityTypes, 'unread') && notHas(files.activityTypes, 'seen'), 'activity unread fields found') },
  { name: 'activity has no badge in contract', run: () => check(notHas(files.activityTypes, 'badge'), 'activity badge field found') },
  { name: 'activity has no mutation action in contract', run: () => check(notHas(files.activityTypes, 'primaryAction'), 'activity primary action found') },
  { name: 'activity groups by day', run: () => check(has(files.activityController, 'groupActivity') && has(files.activityController, 'dateKey'), 'activity day grouping missing') },
  { name: 'activity supports entity/process grouping metadata', run: () => check(has(files.activityController, 'entityKey') && has(files.activityController, 'processKey'), 'activity grouping metadata missing') },
  { name: 'activity opens canonical destinations', run: () => check(has(files.screen, 'handleOpenActivity') && has(files.screen, 'openEntityDetail'), 'activity destination open missing') },
  { name: 'shared screen title is frozen copy', run: () => check(has(files.screen, 'Atención y actividad'), 'shared surface title missing') },
  { name: 'shared screen has Attention tab', run: () => check(has(files.screen, '>Atención</AppText>'), 'attention tab missing') },
  { name: 'shared screen has Activity tab', run: () => check(has(files.screen, '>Actividad</AppText>'), 'activity tab missing') },
  { name: 'activity tab has no badge rendering', run: () => check(has(files.screen, "tab === 'attention'") && notHas(files.screen, "tab === 'activity' && unresolvedCount"), 'activity badge found') },
  { name: 'AppTopBar rightSlot used for attention', run: () => check(has(files.homeTabs, 'rightSlot=') && has(files.homeTabs, 'AttentionTopBarButton'), 'AppTopBar attention slot missing') },
  { name: 'AppTopBar badge hidden on zero', run: () => check(has(files.homeTabs, 'count > 0 ?') && has(files.homeTabs, 'attentionBadge'), 'badge zero hide missing') },
  { name: 'AppTopBar has no Search icon', run: () => check(notHas(files.appTopBar, 'search-outline') && notHas(files.appTopBar, 'PlannerSearch'), 'Search found in AppTopBar') },
  { name: 'no separate Activity topbar icon', run: () => check(notHas(files.homeTabs, 'ActivityTopBar') && notHas(files.homeTabs, 'activityBadge'), 'separate activity icon/badge found') },
  { name: 'route registered in stack', run: () => check(has(files.homeTabs, 'PlannerAttentionActivity') && has(files.homeTabs, 'PlannerAttentionActivityScreen'), 'route screen missing') },
  { name: 'navigation contract includes route', run: () => check(has(files.navContract, "PlannerAttentionActivity: 'PlannerAttentionActivity'"), 'nav contract route missing') },
  { name: 'navigation types include route params', run: () => check(has(files.navTypes, 'PlannerAttentionActivity:'), 'nav type missing') },
  { name: 'feature gate attention enabled', run: () => check(has(files.globalSurfaces, "attention: { surfaceId: 'attention', enabled: true"), 'attention gate not enabled') },
  { name: 'feature gate activity enabled', run: () => check(has(files.globalSurfaces, "activity: { surfaceId: 'activity', enabled: true"), 'activity gate not enabled') },
  { name: 'Inventory remains excluded from Attention', run: () => check(has(files.globalSurfaces, "'attention'") && has(files.globalSurfaces, 'Inventory excluido de Attention'), 'inventory attention exclusion missing') },
  { name: 'Inventory remains excluded from Activity', run: () => check(has(files.globalSurfaces, "'activity'") && has(files.globalSurfaces, 'Inventory excluido de Activity'), 'inventory activity exclusion missing') },
  { name: 'Geni is not visible in screen', run: () => check(notHas(files.screen, 'Geni'), 'visible Geni found in screen') },
  { name: 'Geni is not visible in AppTopBar', run: () => check(notHas(files.homeTabs, 'Geni'), 'visible Geni found in topbar') },
  { name: 'No mark all read', run: () => check(notHas(files.screen, 'Marcar todo') && notHas(files.screen, 'markAll'), 'mark-all-read found') },
  { name: 'No unread dots', run: () => check(notHas(files.screen, 'new-dot') && notHas(files.screen, 'unread'), 'unread UI found') },
  { name: 'Back aborts active requests', run: () => check(has(files.screen, 'attentionAbortRef.current?.abort()') && has(files.screen, 'activityAbortRef.current?.abort()'), 'abort on back missing') },
  { name: 'Household/session reset implemented', run: () => check(has(files.screen, '[accessToken, householdId]') && has(files.screen, "setTab('attention')"), 'context reset missing') },
  { name: 'Late responses discarded', run: () => check(has(files.screen, 'sequence !== attentionSeq.current') && has(files.screen, 'sequence !== activitySeq.current'), 'late response guards missing') },
  { name: 'Offline state exists Attention', run: () => check(has(files.attentionTypes, "kind: 'offline'"), 'attention offline status missing') },
  { name: 'Offline state exists Activity', run: () => check(has(files.activityTypes, "kind: 'offline'"), 'activity offline status missing') },
  { name: 'Forbidden state exists', run: () => check(has(files.screen, 'forbidden') && has(files.attentionTypes, "kind: 'forbidden'") && has(files.activityTypes, "kind: 'forbidden'"), 'forbidden state missing') },
  { name: 'Session invalid state exists', run: () => check(has(files.screen, 'session_invalid'), 'session invalid missing') },
  { name: 'Retry exists for error/offline', run: () => check(has(files.screen, 'onRetry') && has(files.screen, 'Reintentar'), 'retry missing') },
  { name: 'Search stays in Quick Actions regression', run: () => check(read('front/mi-front-limpio/components/planner/QuickActionsMenu.tsx').includes('Buscar en HomePlus'), 'Quick Actions Search missing') },
  { name: 'Quick Actions keeps Task/Event/Plan', run: () => check(files.quickActions.includes('Crear tarea') && files.quickActions.includes('Crear evento') && files.quickActions.includes('Crear plan'), 'quick actions changed') },
  { name: 'No Inventory in activity service', run: () => check(notHas(files.activityController.toLowerCase(), 'inventory'), 'inventory in activity backend') },
  { name: 'No Inventory in attention service', run: () => check(notHas(files.attentionService.toLowerCase(), 'inventory'), 'inventory in attention backend') },
];

for (const test of tests) {
  try {
    test.run();
    passed += 1;
    console.log(`PASS ${test.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${test.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`\nplanner_m11_11a_2c_attention_activity_tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
