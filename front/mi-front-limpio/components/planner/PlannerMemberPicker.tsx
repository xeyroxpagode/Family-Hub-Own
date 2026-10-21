import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAppTheme } from '../../context/AppThemeContext';

export type PlannerMemberOption = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

/**
 * PlannerMemberPicker — primitiva compartida del selector real de
 * integrantes (extraída de TaskForm sin cambiar su UX ni su semántica).
 *
 * Usada por:
 * - TaskForm (creación/edición individual);
 * - Multi-selection batch (REPLACE completo del conjunto).
 *
 * UX preservada de TaskForm:
 * - "Yo" primero cuando `myMembershipId` está presente;
 * - grilla horizontal con avatar/imagen o iniciales;
 * - toggle por integrante;
 * - `Sin responsables` vive dentro del picker cuando se provee `onClear`
 *   (el llamador decide según capabilities CURRENT);
 * - nota shared_once con >1 seleccionado.
 *
 * Semántica batch: REPLACE completo, nunca append.
 */
export function PlannerMemberPicker({
  members,
  selectedIds,
  myMembershipId,
  onToggle,
  onClear,
  allowEmpty = true,
  showSharedNote = true,
  showSemanticsNote = true,
}: {
  members: PlannerMemberOption[];
  selectedIds: string[];
  myMembershipId?: string | null;
  onToggle: (memberId: string) => void;
  onClear?: () => void;
  allowEmpty?: boolean;
  showSharedNote?: boolean;
  showSemanticsNote?: boolean;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const ordered = useMemo(() => {
    if (!myMembershipId) return members;
    const me = members.filter((member) => member.id === myMembershipId);
    const rest = members.filter((member) => member.id !== myMembershipId);
    return [...me, ...rest];
  }, [members, myMembershipId]);

  return (
    <View style={styles.container}>
      {allowEmpty && onClear ? (
        <TouchableOpacity
          style={styles.clearRow}
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Sin responsables"
        >
          <Text style={styles.clearLabel}>Sin responsables</Text>
          {selectedIds.length === 0 ? <Text style={styles.clearActive}>✓</Text> : null}
        </TouchableOpacity>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroller}>
        {ordered.map((member) => {
          const active = selectedIds.includes(member.id);
          const isMe = myMembershipId != null && member.id === myMembershipId;
          const initials = member.name.trim().slice(0, 2).toUpperCase() || '··';
          const label = isMe ? 'Yo' : member.name;
          return (
            <TouchableOpacity
              key={member.id}
              style={styles.avatarOption}
              onPress={() => onToggle(member.id)}
              accessibilityRole="checkbox"
              accessibilityLabel={isMe ? `Seleccionar Yo` : `Seleccionar ${member.name}`}
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.avatarWrap, active && styles.avatarSelected]}>
                {member.avatarUrl ? (
                  <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitials}>{isMe ? 'Yo' : initials}</Text>
                )}
              </View>
              <Text style={[styles.avatarLabel, active && styles.avatarLabelActive]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {showSharedNote && selectedIds.length > 1 ? (
        <Text style={styles.sharedNote}>
          Tarea compartida: cualquiera de las {selectedIds.length} personas puede completarla.
        </Text>
      ) : null}
      {showSemanticsNote ? (
        <Text style={styles.semanticsNote}>Reemplaza a los responsables actuales (nunca agrega).</Text>
      ) : null}
    </View>
  );
}

function createStyles({ colors, spacing }: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    container: { gap: spacing[2] },
    clearRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[3],
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border.default,
      backgroundColor: colors.surface.soft,
    },
    clearLabel: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
    clearActive: { fontSize: 16, fontWeight: '800', color: colors.terracotta[700] },
    scroller: { gap: spacing[2], paddingVertical: 4 },
    avatarOption: { width: 64, alignItems: 'center', gap: 4, minHeight: 44, minWidth: 44 },
    avatarWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.border.default,
      backgroundColor: colors.surface.soft,
    },
    avatarSelected: { borderColor: colors.terracotta[600], backgroundColor: colors.terracotta[100] },
    avatarImage: { width: 44, height: 44, borderRadius: 22 },
    avatarInitials: { fontSize: 14, fontWeight: '700', color: colors.text.secondary },
    avatarLabel: { fontSize: 11, color: colors.text.secondary, textAlign: 'center' },
    avatarLabelActive: { color: colors.terracotta[700], fontWeight: '700' },
    sharedNote: { fontSize: 12, color: colors.text.secondary },
    semanticsNote: { fontSize: 12, color: colors.text.secondary },
  });
}
