import { requestJson } from './api';

export type TrashItemType = 'task' | 'event' | 'goal' | 'milestone';

export type TrashItemParent = {
  type: 'goal';
  id: string;
  title: string;
};

export type TrashItem = {
  type: TrashItemType;
  id: string;
  household_id: string;
  title: string;
  status: string;
  trashed_at: string;
  trashed_by_member_id: string | null;
  trashed_by_display_name: string | null;
  version: number;
  parent: TrashItemParent | null;
  child_count: number;
  restore_requires_parent: boolean;
};

export type TrashListResponse = {
  items: TrashItem[];
};

export type TrashFilterType = 'all' | 'tasks' | 'events' | 'goals';

export const listTrash = (
  accessToken: string,
  options?: { type?: TrashFilterType; limit?: number },
) => {
  const params = new URLSearchParams();

  if (options?.type && options.type !== 'all') {
    params.append('type', options.type);
  }
  if (options?.limit !== undefined) {
    params.append('limit', String(options.limit));
  }

  const query = params.toString();
  return requestJson<TrashListResponse>(
    `/api/planner/trash${query ? `?${query}` : ''}`,
    { accessToken },
  );
};