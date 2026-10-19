import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, type LayoutChangeEvent, PanResponder, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { selectionHaptic } from '../../utils/plannerHaptics';
import { resolveChecklistDropIndex } from '../../services/planner/plannerChecklistDrag';
import { AppText } from '../ui/AppText';

export type PlannerChecklistDraftItem = { key: string; text: string; checked: boolean };
type ChecklistRowLayout = { y: number; height: number };
let checklistKey = 0;
export const makePlannerChecklistDraftItem = (text = '', checked = false): PlannerChecklistDraftItem => ({ key: `checklist-${Date.now()}-${checklistKey += 1}`, text, checked });
export const makePlannerChecklistDraft = (items: readonly { key?: string; text: string; checked: boolean }[] | null | undefined): PlannerChecklistDraftItem[] => (items ?? []).map((item) => ({
  key: typeof item.key === 'string' && item.key ? item.key : makePlannerChecklistDraftItem().key,
  text: item.text,
  checked: item.checked,
}));

export function PlannerChecklistEditor({ items, onChange, disabled = false, onDragStateChange }: { items: PlannerChecklistDraftItem[]; onChange: (items: PlannerChecklistDraftItem[]) => void; disabled?: boolean; onDragStateChange?: (dragging: boolean) => void }) {
  const { colors } = useAppTheme();
  const inputRefs = useRef(new Map<string, TextInput>());
  const rowLayouts = useRef<(ChecklistRowLayout | undefined)[]>([]);
  const [activeDragKey, setActiveDragKey] = useState<string | null>(null);
  useEffect(() => () => onDragStateChange?.(false), [onDragStateChange]);
  const setDragging = useCallback((key: string, dragging: boolean) => {
    setActiveDragKey(dragging ? key : null);
    onDragStateChange?.(dragging);
  }, [onDragStateChange]);
  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return;
    const next = [...items]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); onChange(next);
  };
  const addAfter = (index: number) => {
    const item = makePlannerChecklistDraftItem();
    const next = [...items]; next.splice(index + 1, 0, item); onChange(next);
    setTimeout(() => inputRefs.current.get(item.key)?.focus(), 40);
  };
  return <View style={styles.list}>{items.map((item, index) => <ChecklistRow key={item.key} item={item} index={index} count={items.length} disabled={disabled} dragBlocked={activeDragKey !== null && activeDragKey !== item.key} interactionsLocked={activeDragKey !== null} onDragStateChange={setDragging} onMove={move} resolveTarget={(dragY) => resolveChecklistDropIndex(index, dragY, rowLayouts.current)} onLayout={(event) => { rowLayouts.current[index] = event.nativeEvent.layout; }} onText={(text) => onChange(items.map((entry) => entry.key === item.key ? { ...entry, text } : entry))} onSubmit={() => addAfter(index)} onDelete={() => onChange(items.filter((entry) => entry.key !== item.key))} inputRef={(node) => { if (node) inputRefs.current.set(item.key, node); else inputRefs.current.delete(item.key); }} />)}<TouchableOpacity style={styles.add} disabled={disabled || activeDragKey !== null} onPress={() => addAfter(items.length - 1)} accessibilityRole="button" accessibilityLabel="Agregar paso"><HomePlusIcon name="add" size={18} color={colors.terracotta[600]} /><AppText variant="bodySmall" weight="700" tone="brand">Agregar paso</AppText></TouchableOpacity></View>;
}

function ChecklistRow({ item, index, count, disabled, dragBlocked, interactionsLocked, onDragStateChange, onMove, resolveTarget, onLayout, onText, onSubmit, onDelete, inputRef }: { item: PlannerChecklistDraftItem; index: number; count: number; disabled: boolean; dragBlocked: boolean; interactionsLocked: boolean; onDragStateChange: (key: string, dragging: boolean) => void; onMove: (from: number, to: number) => void; resolveTarget: (dragY: number) => number; onLayout: (event: LayoutChangeEvent) => void; onText: (text: string) => void; onSubmit: () => void; onDelete: () => void; inputRef: (node: TextInput | null) => void }) {
  const { colors } = useAppTheme();
  const reduceMotion = useReduceMotion();
  const dragY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const activated = useRef(false);
  const [dragging, setDragging] = useState(false);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !dragBlocked,
    onMoveShouldSetPanResponder: () => !disabled && !dragBlocked,
    onPanResponderGrant: () => {
      activated.current = true;
      setDragging(true);
      onDragStateChange(item.key, true);
      selectionHaptic();
      Animated.timing(scale, { toValue: reduceMotion ? 1 : 1.01, duration: reduceMotion ? 0 : 80, useNativeDriver: true }).start();
    },
    onPanResponderMove: (_event, gesture) => { if (activated.current) dragY.setValue(gesture.dy); },
    onPanResponderRelease: (_event, gesture) => {
      if (activated.current) onMove(index, resolveTarget(gesture.dy));
      Animated.parallel([
        Animated.timing(dragY, { toValue: 0, duration: reduceMotion ? 0 : 120, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: reduceMotion ? 0 : 120, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: true }),
      ]).start();
      activated.current = false;
      setDragging(false);
      onDragStateChange(item.key, false);
    },
    onPanResponderTerminate: () => { dragY.setValue(0); scale.setValue(1); activated.current = false; setDragging(false); onDragStateChange(item.key, false); },
    onPanResponderTerminationRequest: () => false,
  }), [disabled, dragBlocked, dragY, index, item.key, onDragStateChange, onMove, reduceMotion, resolveTarget, scale]);
  useEffect(() => () => {
    if (activated.current) onDragStateChange(item.key, false);
  }, [item.key, onDragStateChange]);
  return <Animated.View onLayout={onLayout} style={[styles.row, { transform: [{ translateY: dragY }, { scale }], zIndex: dragging ? 2 : 0, elevation: dragging ? 2 : 0 }]}>
    <View {...responder.panHandlers} style={styles.grip} accessible accessibilityRole="adjustable" accessibilityLabel={`Reordenar paso ${index + 1}`} accessibilityActions={[...(index > 0 ? [{ name: 'decrement' as const, label: 'Mover arriba' }] : []), ...(index < count - 1 ? [{ name: 'increment' as const, label: 'Mover abajo' }] : [])]} onAccessibilityAction={(event) => onMove(index, event.nativeEvent.actionName === 'decrement' ? index - 1 : index + 1)}><HomePlusIcon name="reorder-three-outline" size={20} color={colors.text.tertiary} /></View>
    <TextInput ref={inputRef} style={[styles.input, { color: colors.text.primary }]} value={item.text} onChangeText={onText} onSubmitEditing={onSubmit} editable={!disabled && !interactionsLocked} multiline returnKeyType="next" placeholder="Paso" placeholderTextColor={colors.text.muted} />
    <TouchableOpacity style={styles.remove} disabled={disabled || interactionsLocked} onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Eliminar paso ${index + 1}`}><HomePlusIcon name="trash-outline" size={18} color={colors.danger.base} /></TouchableOpacity>
  </Animated.View>;
}

const styles = StyleSheet.create({ list: { gap: 4 }, row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEE8E0' }, grip: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }, input: { flex: 1, minHeight: 48, paddingVertical: 10, fontSize: 15 }, remove: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }, add: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 }, });
