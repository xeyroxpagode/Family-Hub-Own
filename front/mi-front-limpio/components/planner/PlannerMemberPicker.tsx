import React from 'react';
import { HouseholdMemberPicker, type HouseholdMemberOption } from '../ui/HouseholdMemberPicker';

export type PlannerMemberOption = HouseholdMemberOption;

/** Compatibility wrapper preserving Planner's labels and replace semantics. */
export function PlannerMemberPicker({
  members, selectedIds, myMembershipId, onToggle, onClear,
  allowEmpty = true, showSharedNote = true, showSemanticsNote = true,
}: {
  members: PlannerMemberOption[]; selectedIds: string[]; myMembershipId?: string | null;
  onToggle: (memberId: string) => void; onClear?: () => void; allowEmpty?: boolean;
  showSharedNote?: boolean; showSemanticsNote?: boolean;
}) {
  return <HouseholdMemberPicker members={members} selectedIds={selectedIds}
    currentMemberId={myMembershipId} onToggle={onToggle} onClear={onClear}
    allowEmpty={allowEmpty} multiple
    multiSelectionNote={showSharedNote ? (count) => `Tarea compartida: cualquiera de las ${count} personas puede completarla.` : undefined}
    semanticsNote={showSemanticsNote ? 'Reemplaza a los responsables actuales (nunca agrega).' : undefined} />;
}
