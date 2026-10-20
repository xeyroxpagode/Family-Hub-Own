import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../context/AppThemeContext';

export type HouseholdMemberOption = { id: string; name: string; avatarUrl?: string | null };
export type HouseholdMemberPickerProps = {
  members: HouseholdMemberOption[]; selectedIds: string[]; currentMemberId?: string | null;
  onToggle: (id: string) => void; onClear?: () => void; allowEmpty?: boolean; multiple?: boolean;
  emptyLabel?: string; multiSelectionNote?: string | ((count: number) => string); semanticsNote?: string;
};

/** Domain-neutral household member selection; member IDs are opaque. */
export function HouseholdMemberPicker({
  members, selectedIds, currentMemberId, onToggle, onClear, allowEmpty = true,
  multiple = true, emptyLabel = 'Sin responsables', multiSelectionNote, semanticsNote,
}: HouseholdMemberPickerProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ordered = useMemo(() => currentMemberId
    ? [...members.filter((member) => member.id === currentMemberId), ...members.filter((member) => member.id !== currentMemberId)]
    : members, [members, currentMemberId]);
  const note = selectedIds.length > 1 && multiSelectionNote
    ? typeof multiSelectionNote === 'function' ? multiSelectionNote(selectedIds.length) : multiSelectionNote
    : null;
  return <View style={styles.container}>
    {allowEmpty && onClear ? <TouchableOpacity style={styles.clearRow} onPress={onClear} accessibilityRole="button" accessibilityLabel={emptyLabel}>
      <Text style={styles.clearLabel}>{emptyLabel}</Text>{selectedIds.length === 0 ? <Text style={styles.clearActive}>✓</Text> : null}
    </TouchableOpacity> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroller}>
      {ordered.map((member) => {
        const active = selectedIds.includes(member.id);
        const current = currentMemberId != null && member.id === currentMemberId;
        const label = current ? 'Yo' : member.name;
        return <TouchableOpacity key={member.id} style={styles.avatarOption}
          onPress={() => { if (multiple || !active || allowEmpty) onToggle(member.id); }}
          accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityLabel={`Seleccionar ${label}`}
          accessibilityState={{ selected: active }}>
          <View style={[styles.avatarWrap, active && styles.avatarSelected]}>
            {member.avatarUrl ? <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
              : <Text style={styles.avatarInitials}>{current ? 'Yo' : member.name.trim().slice(0, 2).toUpperCase() || '··'}</Text>}
          </View>
          <Text style={[styles.avatarLabel, active && styles.avatarLabelActive]} numberOfLines={1}>{label}</Text>
        </TouchableOpacity>;
      })}
    </ScrollView>
    {note ? <Text style={styles.note}>{note}</Text> : null}
    {semanticsNote ? <Text style={styles.note}>{semanticsNote}</Text> : null}
  </View>;
}

function createStyles({ colors, spacing }: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    container: { gap: spacing[2] },
    clearRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[3], borderRadius: 12, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.soft },
    clearLabel: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
    clearActive: { fontSize: 16, fontWeight: '800', color: colors.terracotta[700] },
    scroller: { gap: spacing[2], paddingVertical: 4 },
    avatarOption: { width: 64, alignItems: 'center', gap: 4, minHeight: 44, minWidth: 44 },
    avatarWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border.default, backgroundColor: colors.surface.soft },
    avatarSelected: { borderColor: colors.terracotta[600], backgroundColor: colors.terracotta[100] },
    avatarImage: { width: 44, height: 44, borderRadius: 22 },
    avatarInitials: { fontSize: 14, fontWeight: '700', color: colors.text.secondary },
    avatarLabel: { fontSize: 11, color: colors.text.secondary, textAlign: 'center' },
    avatarLabelActive: { color: colors.terracotta[700], fontWeight: '700' },
    note: { fontSize: 12, color: colors.text.secondary },
  });
}
