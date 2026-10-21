import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '../ui/AppText';
import { Skeleton } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import { ErrorBar } from './ErrorBar';
import { useAssetPlannerItems } from '../../hooks/assets/useAssetPlannerItems';
import type { AssetPlannerItemDto } from '../../services/assets/plannerItems';

/**
 * HOMePLUS Assets — S7-07: sección "PRÓXIMO" del detalle del activo.
 *
 * Muestra las Tasks y los Events de Planner que referencian el activo. El
 * read model es de Assets; las entidades son de Planner: al tocar un item se
 * abre el detalle REAL de Planner y al volver la sección se revalida.
 *
 * Copy congelado (S7):
 *   - Sección: PRÓXIMO
 *   - Vacío: "Todavía no programaste nada para este activo."
 *   - CTA: "Programar algo"
 *   - Badge de vencida: "Vencida"
 *   - "Ver todos (N)" y "Mostrando 20 de N"
 */

const formatDate = (value: string | null): string => {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
};

const formatTime = (value: string | null): string => (value ? value.slice(0, 5) : '');

const whenLabel = (item: AssetPlannerItemDto): string => {
  const date = formatDate(item.effective_date);
  const time = formatTime(item.effective_time);
  if (date && time) return `${date} · ${time}`;
  if (date) return date;
  return 'Sin fecha';
};

export type AssetPlannerItemsSectionProps = {
  accessToken: string | null;
  householdId: string | null;
  assetId: string;
  /** Puede el usuario abrir el composer de Planner desde acá. */
  canCreateAny: boolean;
  onCreateTask: () => void;
  onCreateEvent: () => void;
};

export function AssetPlannerItemsSection({
  accessToken,
  householdId,
  assetId,
  canCreateAny,
  onCreateTask,
  onCreateEvent,
}: AssetPlannerItemsSectionProps) {
  const navigation = useNavigation<any>();
  const plannerItems = useAssetPlannerItems(accessToken, householdId, assetId);

  const openInPlanner = useCallback(
    (item: AssetPlannerItemDto) => {
      navigation.navigate('PlannerTab', {
        screen: item.kind === 'event' ? 'EventDetail' : 'TaskDetail',
        params: {
          entityId: item.id,
          source: 'assets',
          returnTo: 'previous',
        },
      });
    },
    [navigation],
  );

  const hasItems = plannerItems.items.length > 0;
  const canShowAll = plannerItems.total > plannerItems.items.length;
  const truncated = plannerItems.total > plannerItems.items.length
    && plannerItems.items.length >= 20;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="caption" weight="700" tone="secondary">
          PRÓXIMO
        </AppText>
      </View>

      {plannerItems.error ? (
        <ErrorBar
          visible
          message={plannerItems.error}
          action={{ label: 'Reintentar', onPress: plannerItems.reload }}
        />
      ) : plannerItems.loading && !hasItems ? (
        <Skeleton style={{ height: 72, borderRadius: radius.lg }} />
      ) : hasItems ? (
        <View style={styles.card}>
          {plannerItems.items.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => openInPlanner(item)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${item.kind === 'event' ? 'evento' : 'tarea'} ${item.title}`}
            >
              <View style={styles.row}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.titleRow}>
                    <HomePlusIcon
                      name={item.kind === 'event' ? 'calendar-outline' : 'checkmark-circle-outline'}
                      size={15}
                      color={colors.text.tertiary}
                    />
                    <AppText variant="bodySmall" weight="600" numberOfLines={1}>
                      {item.title}
                    </AppText>
                    {item.overdue ? (
                      <StatusBadge label="Vencida" tone="warning" />
                    ) : null}
                  </View>
                  <AppText variant="caption" tone="tertiary">
                    {item.kind === 'event' ? 'Evento · ' : 'Tarea · '}
                    {whenLabel(item)}
                  </AppText>
                </View>
                <HomePlusIcon
                  name="chevron-forward-outline"
                  size={16}
                  color={colors.text.tertiary}
                />
              </View>
            </Pressable>
          ))}
          {canShowAll ? (
            <Pressable
              onPress={() => plannerItems.setShowAll(true)}
              accessibilityRole="button"
              accessibilityLabel="Ver todos los items programados"
              style={styles.footer}
            >
              <AppText variant="caption" weight="600" tone="brand">
                Ver todos ({plannerItems.total})
              </AppText>
            </Pressable>
          ) : null}
          {truncated ? (
            <AppText variant="caption" tone="tertiary" style={styles.footerNote}>
              Mostrando 20 de {plannerItems.total}
            </AppText>
          ) : null}
        </View>
      ) : (
        <View style={styles.empty}>
          {canCreateAny ? (
            <Pressable
              onPress={onCreateTask}
              accessibilityRole="button"
              accessibilityLabel="Programar algo para este activo"
            >
              <View style={styles.emptyInner}>
                <HomePlusIcon name="calendar-outline" size={20} color={colors.text.tertiary} />
                <AppText variant="bodySmall" tone="secondary">
                  Todavía no programaste nada para este activo.
                </AppText>
              </View>
            </Pressable>
          ) : (
            <View style={styles.emptyInner}>
              <AppText variant="bodySmall" tone="secondary">
                Todavía no programaste nada para este activo.
              </AppText>
            </View>
          )}
        </View>
      )}

      {hasItems && canCreateAny ? (
        <Pressable
          onPress={onCreateTask}
          accessibilityRole="button"
          accessibilityLabel="Programar algo para este activo"
          style={styles.footer}
        >
          <AppText variant="caption" weight="600" tone="brand">
            Programar algo
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[2] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
  },
  divider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border.subtle,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  empty: { paddingVertical: spacing[1] },
  emptyInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  footer: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    alignItems: 'center',
  },
  footerNote: {
    paddingBottom: spacing[3],
    textAlign: 'center',
  },
});
