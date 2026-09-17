import { requestJson } from './api';

export type InventoryCategoryKey =
  | 'kitchen'
  | 'bathroom'
  | 'cleaning'
  | 'tools'
  | 'medication'
  | 'pets'
  | 'general';

export type InventoryTemplate = {
  id: string;
  key: string;
  name: string;
  emoji: string | null;
  category_key: InventoryCategoryKey;
  default_quantity: number;
  default_low_stock_threshold: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type InventoryItem = {
  id: string;
  household_id: string;
  template_id: string | null;
  name: string;
  emoji: string | null;
  category_key: InventoryCategoryKey;
  quantity: number;
  low_stock_threshold: number;
  is_out_of_stock: boolean;
  created_by_person_id: string | null;
  updated_by_person_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryRestockRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type InventoryRestockRequest = {
  id: string;
  household_id: string;
  inventory_item_id: string | null;
  status: InventoryRestockRequestStatus;
  suggested_title: string;
  suggested_description: string | null;
  requested_by_person_id: string | null;
  approved_by_person_id: string | null;
  assigned_to_person_id: string | null;
  planner_task_id: string | null;
  created_at: string;
  updated_at: string;
  item?: Pick<
    InventoryItem,
    'id' | 'name' | 'emoji' | 'quantity' | 'low_stock_threshold' | 'is_out_of_stock' | 'deleted_at'
  > | null;
};

export type InventoryAlerts = {
  total_items: number;
  low_stock_count: number;
  out_of_stock_count: number;
  pending_restock_requests_count: number;
  low_stock_items: InventoryItem[];
  out_of_stock_items: InventoryItem[];
  pending_restock_requests: InventoryRestockRequest[];
};

export type UpsertInventoryItemPayload = {
  template_id?: string | null;
  name?: string;
  emoji?: string | null;
  category_key?: InventoryCategoryKey;
  quantity?: number;
  low_stock_threshold?: number;
};

export type ApproveRestockRequestPayload = {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assigned_to_member_id?: string;
  requires_verification?: boolean;
};

export const listInventoryTemplates = (accessToken: string) =>
  requestJson<{ templates: InventoryTemplate[] }>('/api/inventory/templates', { accessToken });

export const listInventoryItems = (accessToken: string) =>
  requestJson<{ items: InventoryItem[] }>('/api/inventory/items', { accessToken });

export const createInventoryItem = (accessToken: string, payload: UpsertInventoryItemPayload) =>
  requestJson<{ item: InventoryItem }>('/api/inventory/items', {
    method: 'POST',
    accessToken,
    body: payload,
  });

export const updateInventoryItem = (
  accessToken: string,
  itemId: string,
  payload: UpsertInventoryItemPayload,
) =>
  requestJson<{ item: InventoryItem }>(`/api/inventory/items/${itemId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });

export const deleteInventoryItem = (accessToken: string, itemId: string) =>
  requestJson<{ item: InventoryItem }>(`/api/inventory/items/${itemId}`, {
    method: 'DELETE',
    accessToken,
  });

export const addInventoryQuantity = (accessToken: string, itemId: string, quantityDelta = 1) =>
  requestJson<{ item: InventoryItem }>(`/api/inventory/items/${itemId}/add`, {
    method: 'POST',
    accessToken,
    body: { quantity_delta: quantityDelta },
  });

export const consumeInventoryQuantity = (accessToken: string, itemId: string, quantityDelta = 1) =>
  requestJson<{ item: InventoryItem }>(`/api/inventory/items/${itemId}/consume`, {
    method: 'POST',
    accessToken,
    body: { quantity_delta: quantityDelta },
  });

export const markInventoryItemOutOfStock = (accessToken: string, itemId: string) =>
  requestJson<{ item: InventoryItem }>(`/api/inventory/items/${itemId}/out-of-stock`, {
    method: 'POST',
    accessToken,
  });

export const getInventoryAlerts = (accessToken: string) =>
  requestJson<{ alerts: InventoryAlerts }>('/api/inventory/alerts', { accessToken });

export const listInventoryRestockRequests = (accessToken: string, status?: InventoryRestockRequestStatus) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return requestJson<{ requests: InventoryRestockRequest[] }>(`/api/inventory/restock-requests${query}`, {
    accessToken,
  });
};

export const approveInventoryRestockRequest = (
  accessToken: string,
  requestId: string,
  payload: ApproveRestockRequestPayload = {},
) =>
  requestJson<{ request: InventoryRestockRequest; task: unknown }>(
    `/api/inventory/restock-requests/${requestId}/approve`,
    {
      method: 'POST',
      accessToken,
      body: payload,
    },
  );

export const rejectInventoryRestockRequest = (accessToken: string, requestId: string) =>
  requestJson<{ request: InventoryRestockRequest }>(
    `/api/inventory/restock-requests/${requestId}/reject`,
    {
      method: 'POST',
      accessToken,
    },
  );
