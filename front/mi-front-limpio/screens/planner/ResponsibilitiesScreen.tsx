import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PlannerAnchoredMenu, type PlannerAnchoredMenuItem } from '../../components/planner/PlannerAnchoredMenu';
import { classifyPlannerError, toPlannerSafeErrorBehavior } from '../../services/planner/plannerErrorAdapter';
import { AppScreen, AppText, EmptyState, ErrorState, InteractivePressable, Skeleton } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { useAuth } from '../../context/AuthContext';
import { changeResponsibilityLifecycle, listResponsibilities, materializeDueResponsibilities, responsibilityScheduleSummary, type PlannerResponsibility, type ResponsibilityLifecycle } from '../../services/plannerResponsibilities';

const views: Array<{ key: ResponsibilityLifecycle; label: string }> = [{ key: 'active', label: 'Activas' }, { key: 'paused', label: 'Inactivas' }];
const assignmentLabel = (item: PlannerResponsibility) => item.assignment_kind === 'rotation' ? 'Se van turnando' : item.assignment_kind === 'claimable' ? 'Disponible para tomar' : item.assignment_kind === 'unassigned' ? 'Sin responsable' : item.members.length > 1 ? `${item.members.length} integrantes` : 'Misma persona';

export function ResponsibilitiesScreen() {
  const theme = useAppTheme(); const { colors, spacing } = theme; const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<any>(); const { session } = useAuth(); const token = session?.access_token;
  const [view, setView] = useState<ResponsibilityLifecycle>('active'); const [items, setItems] = useState<PlannerResponsibility[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [viewMenuVisible, setViewMenuVisible] = useState(false);
  const viewAnchorRef = useRef<View | null>(null);
  const [menuState, setMenuState] = useState<{ item: PlannerResponsibility; anchorRef: React.RefObject<View | null> } | null>(null);
  const closedMenuAnchorRef = useRef<View | null>(null);
  const load = useCallback(async () => { if (!token) return; setLoading(true); setError(null); try { void materializeDueResponsibilities(token).catch(() => {}); setItems((await listResponsibilities(token, view)).responsibilities); } catch (e) { setError(toPlannerSafeErrorBehavior(classifyPlannerError(e)).message); } finally { setLoading(false); } }, [token, view]);
  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => () => { setMenuState(null); setViewMenuVisible(false); }, []));
  const lifecycleAction = useCallback(async (item: PlannerResponsibility, action: 'pause' | 'resume' | 'trash') => {
    if (!token) return;
    setMenuState(null);
    try { await changeResponsibilityLifecycle(token, item.id, action, item.version); await load(); }
    catch { setError('No pudimos actualizar la responsabilidad. Intentá de nuevo.'); }
  }, [load, token]);
  const menuItems = useMemo<PlannerAnchoredMenuItem[]>(() => menuState ? [
    { label: 'Editar', icon: 'create', onPress: () => navigation.navigate('ResponsibilityDetail', { responsibilityId: menuState.item.id, editMode: true }) },
    menuState.item.lifecycle === 'active'
      ? { label: 'Pausar', icon: 'pause', onPress: () => void lifecycleAction(menuState.item, 'pause') }
      : { label: 'Reactivar', icon: 'play', onPress: () => void lifecycleAction(menuState.item, 'resume') },
    { label: 'Mover a Papelera', icon: 'trash', danger: true, separatorBefore: true, onPress: () => void lifecycleAction(menuState.item, 'trash') },
  ] : [], [lifecycleAction, menuState, navigation]);
  const needs = items.filter((item) => item.requires_adjustment_reason); const normal = items.filter((item) => !item.requires_adjustment_reason);
  return <AppScreen scroll bottomInset="tab">
    <View style={styles.header}>
      <InteractivePressable onPress={() => navigation.goBack()} accessibilityLabel="Volver"><HomePlusIcon name="chevron-back" size={24} color={colors.text.primary} /></InteractivePressable>
      <AppText variant="title2" weight="800" style={{ flex: 1 }}>Responsabilidades</AppText>
      <InteractivePressable onPress={() => navigation.navigate('ResponsibilityCreate')} accessibilityLabel="Nueva responsabilidad"><HomePlusIcon name="add" size={25} color={colors.terracotta[600]} /></InteractivePressable>
    </View>
    <View ref={viewAnchorRef} collapsable={false}>
      <InteractivePressable style={styles.selector} onPress={() => { setMenuState(null); setViewMenuVisible(true); }} accessibilityLabel="Cambiar vista"><AppText weight="800">{views.find((item) => item.key === view)?.label}</AppText><HomePlusIcon name="chevron-down" size={17} color={colors.text.secondary} /></InteractivePressable>
    </View>
    {loading ? <View style={{ gap: spacing[2] }}><Skeleton variant="listItem" /><Skeleton variant="listItem" /></View> : error ? <ErrorState title="No pudimos cargar" description={error} onRetry={() => void load()} /> : !items.length ? <EmptyState title="Todavía no hay responsabilidades" description="Configurá una rutina u obligación una sola vez." actionLabel="Crear responsabilidad" onAction={() => navigation.navigate('ResponsibilityCreate')} /> : <>
      {needs.length ? <Section title="REQUIEREN AJUSTE" items={needs} open={(id) => navigation.navigate('ResponsibilityDetail', { responsibilityId: id })} openMenu={(item, anchorRef) => setMenuState({ item, anchorRef })} /> : null}
      {normal.length ? <Section title={view === 'active' ? 'ACTIVAS' : 'INACTIVAS'} items={normal} open={(id) => navigation.navigate('ResponsibilityDetail', { responsibilityId: id })} openMenu={(item, anchorRef) => setMenuState({ item, anchorRef })} /> : null}
    </>}
    <PlannerAnchoredMenu visible={viewMenuVisible} anchorRef={viewAnchorRef} items={views.map((option) => ({ label: option.label, checked: view === option.key, onPress: () => setView(option.key) }))} onRequestClose={() => setViewMenuVisible(false)} preferredSide="auto" />
    <PlannerAnchoredMenu visible={menuState !== null} anchorRef={menuState?.anchorRef ?? closedMenuAnchorRef} items={menuItems} onRequestClose={() => setMenuState(null)} preferredSide="left" />
  </AppScreen>;
}

function Section({ title, items, open, openMenu }: { title: string; items: PlannerResponsibility[]; open: (id: string) => void; openMenu: (item: PlannerResponsibility, anchorRef: React.RefObject<View | null>) => void }) {
  const theme = useAppTheme(); const { colors, spacing } = theme;
  return <View style={{ marginTop: spacing[5] }}><AppText variant="caption" tone="secondary" weight="800" style={{ marginBottom: spacing[2] }}>{title}</AppText>{items.map((item) => {
    const next = item.current_occurrence?.scheduled_date;
    return <ResponsibilityRow key={item.id} item={item} next={next} open={open} openMenu={openMenu} />;
  })}</View>;
}
function ResponsibilityRow({ item, next, open, openMenu }: { item: PlannerResponsibility; next?: string; open: (id: string) => void; openMenu: (item: PlannerResponsibility, anchorRef: React.RefObject<View | null>) => void }) {
  const { colors } = useAppTheme(); const anchorRef = useRef<View>(null);
  return <View style={{ minHeight: 63, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle }}><InteractivePressable onPress={() => open(item.id)} accessibilityLabel={`Abrir ${item.title}`} style={{ flex: 1, minHeight: 63, justifyContent: 'center', paddingVertical: 10 }}><AppText variant="body" weight="500" numberOfLines={2}>{item.title}</AppText><AppText variant="caption" tone="secondary" style={{ marginTop: 4 }}>{responsibilityScheduleSummary(item)} · {assignmentLabel(item)}</AppText>{item.requires_adjustment_reason ? <AppText variant="caption" tone="danger">{item.requires_adjustment_reason}</AppText> : next ? <AppText variant="caption" tone="tertiary">Próxima: {next}</AppText> : null}</InteractivePressable><View ref={anchorRef} style={{ width: 44, height: 44 }}><InteractivePressable style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onPress={() => openMenu(item, anchorRef)} accessibilityLabel={`Opciones de ${item.title}`}><HomePlusIcon name="ellipsis-horizontal" size={20} color={colors.text.tertiary} /></InteractivePressable></View></View>;
}
const makeStyles = ({ spacing }: ReturnType<typeof useAppTheme>) => StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }, selector: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing[1], minHeight: 44 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] } });
