import React from 'react';

import { useExperience } from '../context/ExperienceContext';
import type { ExperienceMode } from '../services/experiencePreferences';
import { SimpleShell } from './SimpleShell';
import { StandardShell } from './StandardShell';

export type ExperienceShellRoute = 'HomeTabs' | 'SimpleShell';

/**
 * Compatibility helper for legacy/deep-link route selection. Runtime UI must
 * use ExperienceResolver below, which reads the reactive context directly.
 */
export function resolveExperienceShellRoute(mode: ExperienceMode): ExperienceShellRoute {
  return mode === 'simple' ? 'SimpleShell' : 'HomeTabs';
}

/**
 * The single runtime shell decision. Auth, household and domain providers sit
 * above this component, so only presentation/navigation is replaced on mode
 * changes.
 */
export function ExperienceResolver() {
  const { experienceMode } = useExperience();
  return experienceMode === 'simple' ? <SimpleShell /> : <StandardShell />;
}
