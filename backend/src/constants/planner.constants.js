const TASK_STATUSES = [
  'pending',
  'completed',
  'awaiting_verification',
  'verified',
  'cancelled',
]

const TASK_PRIORITIES = [
  'low',
  'medium',
  'high',
  'critical',
]

const TASK_TEMPLATE_KEYS = [
  'cleaning',
  'shopping',
  'pets',
  'medication',
  'studies',
  'payments',
]

const EVENT_STATUSES = [
  'scheduled',
  'cancelled',
]

const EVENT_RECURRENCES = [
  'none',
  'daily',
  'weekly',
  'monthly',
]

const TASK_STATUS_ORDER = {
  pending: 0,
  awaiting_verification: 1,
  verified: 2,
  completed: 3,
  cancelled: 4,
}

const GOAL_STATUSES = [
  'active',
  'completed',
  'failed',
]

const GOAL_STATUS_TRANSITIONS = {
  active: ['completed', 'failed'],
  completed: [],
  failed: [],
}

const GOAL_VISIBILITY_VALUES = [
  'household',
  'personal',
]

const GOAL_CATEGORIES = [
  'home',
  'family',
  'finance',
  'health',
  'education',
  'other',
]

const GOAL_TARGET_TYPES = [
  'count',
  'percentage',
  'amount',
  'boolean',
]

module.exports = {
  EVENT_RECURRENCES,
  EVENT_STATUSES,
  GOAL_CATEGORIES,
  GOAL_STATUS_TRANSITIONS,
  GOAL_STATUSES,
  GOAL_TARGET_TYPES,
  GOAL_VISIBILITY_VALUES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_STATUS_ORDER,
  TASK_TEMPLATE_KEYS,
}
