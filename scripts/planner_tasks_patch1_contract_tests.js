#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('supabase/migrations/20261014000001_planner_task_checklist_persistence.sql');
const taskService = read('backend/src/services/planner.tasks.service.js');
const checklistEditor = read('front/mi-front-limpio/components/planner/PlannerChecklistEditor.tsx');
const taskForm = read('front/mi-front-limpio/screens/planner/TaskForm.tsx');
const taskDetail = read('front/mi-front-limpio/screens/planner/TaskDetailScreen.tsx');
const checklistQueue = read('front/mi-front-limpio/services/planner/plannerTaskChecklistMutationQueue.ts');
const taskList = read('front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx');
const presetEditor = read('front/mi-front-limpio/components/planner/presets/PlannerPresetEditorScreen.tsx');
const presetRoutes = read('front/mi-front-limpio/components/planner/presets/PlannerPresetDraftsIntegrationRoutes.tsx');
const presetPicker = read('front/mi-front-limpio/components/planner/presets/PlannerPresetPickerSheet.tsx');
let passed = 0;

function check(condition, message) {
  assert.ok(condition, message);
  passed += 1;
  console.log(`PASS: ${message}`);
}

check(migration.includes("case when p_payload ? 'checklist' then p_payload->'checklist' else '[]'::jsonb end"), 'create defaults omitted checklist to [] and persists a supplied array');
check(migration.includes("checklist = case when p_payload ? 'checklist' then p_payload->'checklist' else checklist end"), 'update replaces a supplied checklist and preserves an omitted checklist');
check(taskService.includes("return { text, checked: item.checked }") && !taskService.includes('return JSON.stringify(value)'), 'backend passes a normalized JSON array to the RPC instead of a JSON string');
check(migration.includes('pg_get_functiondef') && migration.includes('definition drifted'), 'forward migration preserves later RPC hardening and fails on definition drift');
check(checklistEditor.includes("typeof item.key === 'string' && item.key ? item.key"), 'edit hydration preserves an existing UI key');
check(checklistEditor.includes('resolveChecklistDropIndex') && !checklistEditor.includes('gesture.dy / 52'), 'drag uses measured row geometry instead of a fixed row height');
check(checklistEditor.includes('<View {...responder.panHandlers} style={styles.grip}'), 'drag begins only from the row grip');
check(taskDetail.includes('checklistQueueRef.current.setDesired(newChecklist)') && checklistQueue.includes('this.desiredChecklist = cloneChecklist(this.authoritative.checklist)'), 'detail toggle is optimistic and rolls back to authoritative checklist on terminal failure');
check(taskDetail.includes('checklist: editDraft.checklist.filter') && taskDetail.includes('makePlannerChecklistDraft(task.checklist)'), 'detail edit hydrates and persists the full ordered checklist');
check(presetEditor.includes('<PlannerChecklistEditor items={checklist} onChange={setChecklist}'), 'preset editor reuses the canonical checklist editor');
check(taskForm.includes('basePresetDraftRef') && taskForm.includes('derivedPresetFieldsRef') && taskForm.includes('currentManualDraftForConflict'), 'preset application tracks the manual underlay separately from derived fields');
check(taskForm.includes('base.title = title') && taskForm.includes("derived.delete('title')"), 'manual edits after applying a preset are retained in the underlay');
check(presetPicker.includes('Crear preset desde este borrador') && taskForm.includes('returnToTaskDraft: true') && presetRoutes.includes('navigation.popTo(returnRouteName'), 'new Task can create a preset and return to the still-mounted draft with the saved payload');
check(!taskList.includes('setTimeout(resolve, 160)') && taskList.includes('setTasks((current) => current.map((item) => (item.id === task.id ? resultTask! : item)))'), 'complete reconciles authoritative state without the redundant delay');
check(taskList.includes('setMenuState(null);') && taskList.includes('setOpenSwipe(null);') && taskList.includes('trashedTask.version'), 'root trash clears overlays, reconciles locally, and uses the authoritative version for Undo');
check(taskDetail.indexOf('sheet.pushToast({', taskDetail.indexOf('const handleTrash')) < taskDetail.indexOf('handleBack();', taskDetail.indexOf('const handleTrash')), 'detail trash registers feedback before navigation');

console.log(`Planner Tasks Patch 1 contract tests passed (${passed} assertions).`);
