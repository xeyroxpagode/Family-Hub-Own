-- P0-001A: Planner Version Columns + Optimistic Concurrency Triggers
-- Adds version infrastructure to all mutable Planner tables.
-- Migration: 20260712000000

-- ============================================================================
-- PART A: Add version columns with DEFAULT 1 + NOT NULL
-- ============================================================================

ALTER TABLE public.planner_tasks
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE public.planner_events
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE public.planner_goals
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE public.planner_goal_milestones
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- ============================================================================
-- PART A continued: CHECK constraints using DO blocks for idempotent safety
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'planner_tasks_version_positive'
      AND conrelid = 'public.planner_tasks'::regclass
  ) THEN
    ALTER TABLE public.planner_tasks
      ADD CONSTRAINT planner_tasks_version_positive CHECK (version >= 1);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'planner_events_version_positive'
      AND conrelid = 'public.planner_events'::regclass
  ) THEN
    ALTER TABLE public.planner_events
      ADD CONSTRAINT planner_events_version_positive CHECK (version >= 1);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'planner_goals_version_positive'
      AND conrelid = 'public.planner_goals'::regclass
  ) THEN
    ALTER TABLE public.planner_goals
      ADD CONSTRAINT planner_goals_version_positive CHECK (version >= 1);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'planner_goal_milestones_version_positive'
      AND conrelid = 'public.planner_goal_milestones'::regclass
  ) THEN
    ALTER TABLE public.planner_goal_milestones
      ADD CONSTRAINT planner_goal_milestones_version_positive CHECK (version >= 1);
  END IF;
END;
$$;

-- ============================================================================
-- PART B: Trigger function for atomic version increment
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_planner_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART C: Attach BEFORE UPDATE triggers to each mutable Planner table
-- Trigger names are alphabetically ordered to fire AFTER existing updated_at
-- triggers: trg_*_updated_at < trg_*_increment_version
-- Both are BEFORE UPDATE, so updated_at is set first, then version increments.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_planner_tasks_increment_version ON public.planner_tasks;
CREATE TRIGGER trg_planner_tasks_increment_version
  BEFORE UPDATE ON public.planner_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_planner_version();

DROP TRIGGER IF EXISTS trg_planner_events_increment_version ON public.planner_events;
CREATE TRIGGER trg_planner_events_increment_version
  BEFORE UPDATE ON public.planner_events
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_planner_version();

DROP TRIGGER IF EXISTS trg_planner_goals_increment_version ON public.planner_goals;
CREATE TRIGGER trg_planner_goals_increment_version
  BEFORE UPDATE ON public.planner_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_planner_version();

DROP TRIGGER IF EXISTS trg_planner_goal_milestones_increment_version ON public.planner_goal_milestones;
CREATE TRIGGER trg_planner_goal_milestones_increment_version
  BEFORE UPDATE ON public.planner_goal_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_planner_version();