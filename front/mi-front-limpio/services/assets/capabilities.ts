/**
 * HOMePLUS Assets — F0 Foundation. Gating de capabilities por operación.
 *
 * Tres capabilities canónicas (backend assetsCapabilities.js):
 *   assets.view / assets.contribute / assets.manage  (MANAGE ⇒ CONTRIBUTE ⇒ VIEW)
 *
 * Gating por OPERACIÓN, no sólo por menú (Target §13). El servidor mantiene
 * autoridad final: este módulo sólo decide qué mostrar/habilitar en UI.
 * Nunca resuelve capabilities desde el rol: recibe la proyección.
 */

import { hasCapability } from '../core/capabilities';
import type { AssetsCapability, AssetsCapabilityProjection } from './types';

export type AssetsOperation =
  | 'assets.list'
  | 'assets.read'
  | 'assets.create'
  | 'assets.rename'
  | 'assets.identity'
  | 'assets.category'
  | 'assets.context'
  | 'assets.lifecycle'
  | 'assets.manage'
  | 'assets.profile'
  | 'assets.archive'
  | 'assets.trash_restore'
  | 'assets.records.read'
  | 'assets.records.write'
  | 'assets.records.link'
  | 'assets.records.remove_restore'
  | 'assets.care.read'
  | 'assets.care.write'
  | 'assets.care.remove_restore';

/**
 * Contrato de gating por operación.
 *
 * Refleja EXACTAMENTE la autoridad del backend
 * (backend/src/services/assets.service.js → contextWithCapability):
 *   - crear/leer/corregir/renovar Record  → assets.contribute
 *   - vincular/desvincular Record          → assets.manage
 *   - retirar/restaurar Record             → assets.manage
 *   - crear/editar Care                    → assets.contribute
 *   - retirar/restaurar Care               → assets.manage
 *   - profile / archivar / papelera        → assets.manage
 */
export const OPERATION_CAPABILITY: Record<AssetsOperation, AssetsCapability> = {
  'assets.list': 'assets.view',
  'assets.read': 'assets.view',
  'assets.create': 'assets.contribute',
  'assets.rename': 'assets.contribute',
  'assets.identity': 'assets.contribute',
  'assets.category': 'assets.contribute',
  'assets.context': 'assets.contribute',
  'assets.lifecycle': 'assets.contribute',
  'assets.manage': 'assets.manage',
  'assets.profile': 'assets.manage',
  'assets.archive': 'assets.manage',
  'assets.trash_restore': 'assets.manage',
  'assets.records.read': 'assets.view',
  'assets.records.write': 'assets.contribute',
  'assets.records.link': 'assets.manage',
  'assets.records.remove_restore': 'assets.manage',
  'assets.care.read': 'assets.view',
  'assets.care.write': 'assets.contribute',
  'assets.care.remove_restore': 'assets.manage',
};

export const capabilityForOperation = (operation: AssetsOperation): AssetsCapability =>
  OPERATION_CAPABILITY[operation];

export const canPerform = (
  projection: Partial<AssetsCapabilityProjection> | null | undefined,
  operation: AssetsOperation,
): boolean => hasCapability(projection, OPERATION_CAPABILITY[operation]);

export const canView = (
  projection: Partial<AssetsCapabilityProjection> | null | undefined,
): boolean => hasCapability(projection, 'assets.view');

export const canContribute = (
  projection: Partial<AssetsCapabilityProjection> | null | undefined,
): boolean => hasCapability(projection, 'assets.contribute');

export const canManage = (
  projection: Partial<AssetsCapabilityProjection> | null | undefined,
): boolean => hasCapability(projection, 'assets.manage');
