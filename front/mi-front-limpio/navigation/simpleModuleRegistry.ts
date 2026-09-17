import type { HomePlusIconName } from '../constants/icons';

export type SimpleModuleId = 'feed' | 'planner' | 'family' | 'inventory' | 'finance' | 'location' | 'settings';

export type SimpleModuleRoute = 'SimpleFamily' | 'SimpleAgenda' | 'SimpleModuleEntry' | 'SimpleSettings';

export type SimpleModule = {
  id: SimpleModuleId;
  label: string;
  description: string;
  icon: HomePlusIconName;
  route: SimpleModuleRoute;
  /** Future PermissionSnapshot integration point; never resolve this from role. */
  requiredCapability?: string;
};

/**
 * Single registry shared by the Simple hub and More. The current frontend has
 * no general PermissionSnapshot yet, so callers can inject capabilities when
 * that authority lands without introducing role checks in the shell.
 */
export const SIMPLE_MODULE_REGISTRY: readonly SimpleModule[] = Object.freeze([
  { id: 'family', label: 'Familia', description: 'Integrantes del hogar', icon: 'people-outline', route: 'SimpleFamily' },
  { id: 'planner', label: 'Planner', description: 'Tareas y eventos', icon: 'calendar-outline', route: 'SimpleAgenda', requiredCapability: 'planner.read' },
  { id: 'feed', label: 'Actividad', description: 'Novedades del hogar', icon: 'chatbubbles-outline', route: 'SimpleModuleEntry' },
  { id: 'inventory', label: 'Inventario', description: 'Compras y elementos', icon: 'archive-outline', route: 'SimpleModuleEntry' },
  { id: 'finance', label: 'Finanzas', description: 'Saldos y movimientos', icon: 'wallet-outline', route: 'SimpleModuleEntry', requiredCapability: 'finance.read' },
  { id: 'location', label: 'Ubicación', description: 'Presencia del hogar', icon: 'location-outline', route: 'SimpleModuleEntry', requiredCapability: 'location.read' },
  { id: 'settings', label: 'Configuración', description: 'Ajustes de la aplicación', icon: 'settings-outline', route: 'SimpleSettings' },
]);

export function getSimpleModules(canUse?: (capability: string) => boolean): readonly SimpleModule[] {
  return SIMPLE_MODULE_REGISTRY.filter((module) => !module.requiredCapability || !canUse || canUse(module.requiredCapability));
}
