-- Planner V0 Schema Verification Checks
-- Safe to run manually in Supabase Studio or via:
-- supabase db query -f docs/implementation/planner/PLANNER_V0_SCHEMA_CHECKS.sql
-- Returns rows: check_name | status | details

-- Helper: returns 'PASS' or 'FAIL' with details
SELECT '=== TABLE EXISTENCE ===' AS section;

SELECT 'planner_tasks exists' AS check_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='planner_tasks')
    THEN 'PASS' ELSE 'FAIL' END AS status,
  '' AS details
UNION ALL
SELECT 'planner_events exists',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='planner_events')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'planner_goals exists',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='planner_goals')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'planner_goal_milestones exists',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='planner_goal_milestones')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'planner_idempotency_keys exists',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='planner_idempotency_keys')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'planner_activity_log exists',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='planner_activity_log')
    THEN 'PASS' ELSE 'FAIL' END, '';

SELECT '=== TASK COLUMNS ===' AS section;

SELECT 'tasks.version' AS check_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='version')
    THEN 'PASS' ELSE 'FAIL' END AS status,
  '' AS details
UNION ALL
SELECT 'tasks.created_by_member_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='created_by_member_id')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'tasks.completed_by_member_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='completed_by_member_id')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'tasks.verified_by_member_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='verified_by_member_id')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'tasks.assigned_to_member_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='assigned_to_member_id')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'tasks.trashed_at',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='trashed_at')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'tasks.trashed_by_member_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='trashed_by_member_id')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'tasks.cancelled_at',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='cancelled_at')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'tasks.cancelled_by_member_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='cancelled_by_member_id')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'tasks.cancelled_reason',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='cancelled_reason')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'tasks.cancelled_from_status',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='cancelled_from_status')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'tasks.priority',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='priority')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'tasks.status',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='status')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'tasks.goal_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_tasks' AND column_name='goal_id')
    THEN 'PASS' ELSE 'FAIL' END, '';

SELECT '=== EVENT COLUMNS ===' AS section;

SELECT 'events.version' AS check_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_events' AND column_name='version')
    THEN 'PASS' ELSE 'FAIL' END AS status, '' AS details
UNION ALL
SELECT 'events.created_by_member_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_events' AND column_name='created_by_member_id')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'events.trashed_at',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_events' AND column_name='trashed_at')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'events.trashed_by_member_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_events' AND column_name='trashed_by_member_id')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'events.cancelled_at',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_events' AND column_name='cancelled_at')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'events.cancelled_by_member_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_events' AND column_name='cancelled_by_member_id')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'events.cancelled_reason',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_events' AND column_name='cancelled_reason')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'events.cancelled_from_status',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_events' AND column_name='cancelled_from_status')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'events.status',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_events' AND column_name='status')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'events.recurrence',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_events' AND column_name='recurrence')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'events.parent_event_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_events' AND column_name='parent_event_id')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'events.original_occurrence_start_at',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_events' AND column_name='original_occurrence_start_at')
    THEN 'PASS' ELSE 'FAIL' END, '';

SELECT '=== GOAL COLUMNS ===' AS section;

SELECT 'goals.version' AS check_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_goals' AND column_name='version')
    THEN 'PASS' ELSE 'FAIL' END AS status, '' AS details
UNION ALL
SELECT 'goals.status',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_goals' AND column_name='status')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'goals.closed_at',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_goals' AND column_name='closed_at')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'goals.closed_reason',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_goals' AND column_name='closed_reason')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'goals.trashed_at',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_goals' AND column_name='trashed_at')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'goals.trashed_by_member_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_goals' AND column_name='trashed_by_member_id')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'goals.deleted_at',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_goals' AND column_name='deleted_at')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'goals.progress_mode',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_goals' AND column_name='progress_mode')
    THEN 'PASS' ELSE 'FAIL' END, '';

SELECT '=== MILESTONE COLUMNS ===' AS section;

SELECT 'milestones.version' AS check_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_goal_milestones' AND column_name='version')
    THEN 'PASS' ELSE 'FAIL' END AS status, '' AS details
UNION ALL
SELECT 'milestones.achieved',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_goal_milestones' AND column_name='achieved')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'milestones.achieved_at',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_goal_milestones' AND column_name='achieved_at')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'milestones.trashed_at',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_goal_milestones' AND column_name='trashed_at')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'milestones.trashed_by_member_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_goal_milestones' AND column_name='trashed_by_member_id')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'milestones.deleted_at',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='planner_goal_milestones' AND column_name='deleted_at')
    THEN 'PASS' ELSE 'FAIL' END, '';

SELECT '=== FUNCTIONS / RPCS ===' AS section;

SELECT 'reserve_planner_idempotency_key' AS check_name,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='reserve_planner_idempotency_key')
    THEN 'PASS' ELSE 'FAIL' END AS status, '' AS details
UNION ALL
SELECT 'complete_planner_idempotency_key',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='complete_planner_idempotency_key')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'trash_goal_rpc',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='trash_goal_rpc')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'restore_goal_rpc',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='restore_goal_rpc')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'trash_milestone_rpc',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='trash_milestone_rpc')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'restore_milestone_rpc',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='restore_milestone_rpc')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'soft_delete_goal_milestone_rpc (legacy)',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='soft_delete_goal_milestone_rpc')
    THEN 'PASS (legacy present)' ELSE 'FAIL (not found)' END, '';

SELECT '=== RLS ENABLED ===' AS section;

SELECT 'planner_tasks RLS enabled' AS check_name,
  CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL' END AS status, '' AS details
FROM pg_class WHERE relname='planner_tasks' AND relnamespace='public'::regnamespace
UNION ALL
SELECT 'planner_events RLS enabled',
  CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL' END, ''
FROM pg_class WHERE relname='planner_events' AND relnamespace='public'::regnamespace
UNION ALL
SELECT 'planner_goals RLS enabled',
  CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL' END, ''
FROM pg_class WHERE relname='planner_goals' AND relnamespace='public'::regnamespace
UNION ALL
SELECT 'planner_goal_milestones RLS enabled',
  CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL' END, ''
FROM pg_class WHERE relname='planner_goal_milestones' AND relnamespace='public'::regnamespace
UNION ALL
SELECT 'planner_idempotency_keys RLS enabled',
  CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL' END, ''
FROM pg_class WHERE relname='planner_idempotency_keys' AND relnamespace='public'::regnamespace
UNION ALL
SELECT 'planner_activity_log RLS enabled',
  CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL' END, ''
FROM pg_class WHERE relname='planner_activity_log' AND relnamespace='public'::regnamespace;

SELECT '=== CHECK CONSTRAINTS ===' AS section;

SELECT 'tasks.priority low|normal|high' AS check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name='planner_tasks' AND ccu.column_name='priority'
      AND cc.check_clause ILIKE '%low%normal%high%' AND cc.check_clause NOT ILIKE '%medium%' AND cc.check_clause NOT ILIKE '%critical%'
  ) THEN 'PASS' ELSE 'FAIL' END AS status,
  'Should allow only low, normal, high' AS details
UNION ALL
SELECT 'tasks.status includes pending/awaiting_verification/completed/verified/cancelled',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name='planner_tasks' AND ccu.column_name='status'
      AND cc.check_clause ILIKE '%pending%' AND cc.check_clause ILIKE '%awaiting_verification%' AND cc.check_clause ILIKE '%completed%' AND cc.check_clause ILIKE '%verified%' AND cc.check_clause ILIKE '%cancelled%'
  ) THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'events.status scheduled|cancelled',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name='planner_events' AND ccu.column_name='status'
      AND cc.check_clause ILIKE '%scheduled%' AND cc.check_clause ILIKE '%cancelled%'
  ) THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'goals.status active|completed|closed',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name='planner_goals' AND ccu.column_name='status'
      AND cc.check_clause ILIKE '%active%' AND cc.check_clause ILIKE '%completed%' AND cc.check_clause ILIKE '%closed%'
      AND cc.check_clause NOT ILIKE '%failed%'
  ) THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'tasks.version >= 1',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name='planner_tasks' AND ccu.column_name='version'
      AND cc.check_clause ILIKE '%version%>=%1%'
  ) THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'events.version >= 1',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name='planner_events' AND ccu.column_name='version'
      AND cc.check_clause ILIKE '%version%>=%1%'
  ) THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'goals.version >= 1',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name='planner_goals' AND ccu.column_name='version'
      AND cc.check_clause ILIKE '%version%>=%1%'
  ) THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'milestones.version >= 1',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name='planner_goal_milestones' AND ccu.column_name='version'
      AND cc.check_clause ILIKE '%version%>=%1%'
  ) THEN 'PASS' ELSE 'FAIL' END, '';

SELECT '=== VERSION TRIGGERS ===' AS section;

SELECT 'trg_planner_tasks_increment_version' AS check_name,
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_planner_tasks_increment_version')
    THEN 'PASS' ELSE 'FAIL' END AS status, '' AS details
UNION ALL
SELECT 'trg_planner_events_increment_version',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_planner_events_increment_version')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'trg_planner_goals_increment_version',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_planner_goals_increment_version')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'trg_planner_goal_milestones_increment_version',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_planner_goal_milestones_increment_version')
    THEN 'PASS' ELSE 'FAIL' END, '';

SELECT '=== KEY INDEXES (untrashed partial) ===' AS section;

SELECT 'planner_tasks_household_untrashed_idx' AS check_name,
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='planner_tasks_household_untrashed_idx')
    THEN 'PASS' ELSE 'FAIL' END AS status, '' AS details
UNION ALL
SELECT 'planner_events_household_untrashed_idx',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='planner_events_household_untrashed_idx')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'planner_goals_household_untrashed_idx',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='planner_goals_household_untrashed_idx')
    THEN 'PASS' ELSE 'FAIL' END, ''
UNION ALL
SELECT 'planner_goal_milestones_goal_untrashed_idx',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='planner_goal_milestones_goal_untrashed_idx')
    THEN 'PASS' ELSE 'FAIL' END, '';

SELECT '=== SUMMARY ===' AS section;
SELECT 'All checks completed. Review any FAIL rows above.' AS check_name, '' AS status, '' AS details;