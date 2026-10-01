import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ActionSheet, AppScreen, AppText, EmptyState, ErrorState, FilterChip, InteractivePressable, Skeleton } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { useAuth } from '../../context/AuthContext';
import { listResponsibilities, responsibilityScheduleSummary, type PlannerResponsibility, type ResponsibilityLifecycle } from '../../services/plannerResponsibilities';

const views: Array<{ key: ResponsibilityLifecycle; label: string }> = [{ key: 'active', label: 'Activas' }, { key: 'paused', label: 'Pausadas' }, { key: 'archived', label: 'Archivadas' }];
const assignmentLabel = (item: PlannerResponsibility) => item.assignment_kind === 'rotation' ? 'Se van turnando' : item.assignment_kind === 'claimable' ? 'Disponible para tomar' : item.assignment_kind === 'unassigned' ? 'Sin responsable' : item.members.length > 1 ? `${item.members.length} integrantes` : 'Misma persona';

export function ResponsibilitiesScreen() {
  const theme = useAppTheme(); const { colors, spacing } = theme; const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<any>(); const { session } = useAuth(); const token = session?.access_token;
  const [view, setView] = useState<ResponsibilityLifecycle>('active'); const [items, setItems] = useState<PlannerResponsibility[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [sheet, setSheet] = useState(false);
  const load = useCallback(async () => { if (!token) return; setLoading(true); setError(null); try { setItems((await listResponsibilities(token, view)).responsibilities); } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos cargar las responsabilidades.'); } finally { setLoading(false); } }, [token, view]);
  useEffect(() => { void load(); }, [load]);
  const needs = items.filter((item) => item.requires_adjustment_reason); const normal = items.filter((item) => !item.requires_adjustment_reason);
  return <AppScreen scroll bottomInset="tab">
    <View style={styles.header}>
      <InteractivePressable onPress={() => navigation.goBack()} accessibilityLabel="Volver"><HomePlusIcon name="chevron-back" size={24} color={colors.text.primary} /></InteractivePressable>
      <AppText variant="title2" weight="800" style={{ flex: 1 }}>Responsabilidades</AppText>
      <InteractivePressable onPress={() => navigation.navigate('ResponsibilityCreate')} accessibilityLabel="Nueva responsabilidad"><HomePlusIcon name="add" size={25} color={colors.terracotta[600]} /></InteractivePressable>
    </View>
    <InteractivePressable style={styles.selector} onPress={() => setSheet(true)} accessibilityLabel="Cambiar vista"><AppText weight="800">{views.find((item) => item.key === view)?.label}</AppText><HomePlusIcon name="chevron-down" size={17} color={colors.text.secondary} /></InteractivePressable>
    {loading ? <View style={{ gap: spacing[2] }}><Skeleton variant="listItem" /><Skeleton variant="listItem" /></View> : error ? <ErrorState title="No pudimos cargar" description={error} onRetry={() => void load()} /> : !items.length ? <EmptyState title="Todavía no hay responsabilidades" description="Configurá una rutina u obligación una sola vez." actionLabel="Crear responsabilidad" onAction={() => navigation.navigate('ResponsibilityCreate')} /> : <>
      {needs.length ? <Section title="REQUIEREN AJUSTE" items={needs} open={(id) => navigation.navigate('ResponsibilityDetail', { responsibilityId: id })} /> : null}
      {normal.length ? <Section title={view === 'active' ? 'ACTIVAS' : view === 'paused' ? 'PAUSADAS' : 'ARCHIVADAS'} items={normal} open={(id) => navigation.navigate('ResponsibilityDetail', { responsibilityId: id })} /> : null}
    </>}
    <ActionSheet visible={sheet} title="Ver responsabilidades" onRequestClose={() => setSheet(false)} size="content"><View style={styles.chips}>{views.map((option) => <FilterChip key={option.key} label={option.label} selected={view === option.key} onPress={() => { setView(option.key); setSheet(false); }} />)}</View></ActionSheet>
  </AppScreen>;
}

function Section({ title, items, open }: { title: string; items: PlannerResponsibility[]; open: (id: string) => void }) {
  const theme = useAppTheme(); const { colors, spacing } = theme;
  return <View style={{ marginTop: spacing[5] }}><AppText variant="caption" tone="secondary" weight="800" style={{ marginBottom: spacing[2] }}>{title}</AppText>{items.map((item) => {
    const next = item.current_occurrence?.scheduled_date;
    return <InteractivePressable key={item.id} onPress={() => open(item.id)} accessibilityLabel={`Abrir ${item.title}`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
      <View style={{ flex: 1, gap: spacing[1] }}><AppText variant="body" weight="800">{item.title}</AppText><AppText variant="caption" tone="secondary">{responsibilityScheduleSummary(item)} · {assignmentLabel(item)}</AppText>{item.requires_adjustment_reason ? <AppText variant="caption" tone="danger">{item.requires_adjustment_reason}</AppText> : next ? <AppText variant="caption" tone="tertiary">Próxima: {next}</AppText> : null}</View>
      <HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary} />
    </InteractivePressable>;
  })}</View>;
}
const makeStyles = ({ spacing }: ReturnType<typeof useAppTheme>) => StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }, selector: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing[1], minHeight: 44 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] } });
