import type { HouseholdMember } from '../households';

export type HomeRoleRoute = 'coordinator' | 'adult' | 'adolescent' | 'senior' | 'safe_fallback';

export function resolveHomeRoleRoute(role: HouseholdMember['rol'] | null): HomeRoleRoute {
  if (role === 'coordinador') return 'coordinator';
  if (role === 'adulto') return 'adult';
  if (role === 'adolescente') return 'adolescent';
  if (role === 'adulto_mayor') return 'senior';
  return 'safe_fallback';
}
