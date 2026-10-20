import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, StyleSheet, View, useWindowDimensions, TextInput } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { useKeyboardVisible } from '../../hooks/useKeyboardVisible';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { resolveDragDismiss } from '../../services/planner/plannerSheetGuard';
import { todayYMD } from '../../utils/civilDate';
import { buildMinuteWheelValues } from '../../utils/timeWheel';
import { selectionHaptic, warningHaptic } from '../../utils/plannerHaptics';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { InteractivePressable } from './InteractivePressable';

LocaleConfig.locales.es = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

const WHEEL_ITEM_HEIGHT = 44;

export const formatHumanDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return 'Elegir fecha';
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.getTime() === today.getTime()) return 'Hoy';
  if (date.getTime() === tomorrow.getTime()) return 'Mañana';
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
};

type InlinePickerProps = { title: string; onClose: () => void; onConfirm: () => void; children: React.ReactNode };

/**
 * Drag-to-dismiss for compact sheets (ActionSheet / InlinePicker chrome).
 * The drag claims the gesture only in the MOVE capture phase and only while
 * the sheet is dismissible; release resolves distance + velocity through the
 * shared `resolveDragDismiss` contract, so every sheet in the app shares the
 * same thresholds.
 */
function useSheetDragDismiss(options: { dismissible: () => boolean; onSheetDismissed: () => void }) {
  const riseRef = useRef(new Animated.Value(0)).current;
  const heightRef = useRef(600);
  const dismissibleRef = useRef(options.dismissible);
  dismissibleRef.current = options.dismissible;
  const onSheetDismissedRef = useRef(options.onSheetDismissed);
  onSheetDismissedRef.current = options.onSheetDismissed;

  const settle = useCallback(() => {
    Animated.spring(riseRef, { toValue: 0, useNativeDriver: true, friction: 9, tension: 100 }).start();
  }, [riseRef]);

  const release = useCallback(
    (dy: number, vy: number) => {
      if (resolveDragDismiss({ dy, vy, panelHeight: heightRef.current }) === 'dismiss') {
        Animated.timing(riseRef, {
          toValue: heightRef.current,
          duration: 200,
          easing: Easing.bezier(0.55, 0, 1, 0.45),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) onSheetDismissedRef.current();
        });
      } else {
        settle();
      }
    },
    [riseRef, settle],
  );

  const panHandlers = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          dismissibleRef.current() && gesture.dy > 10 && gesture.vy > 0,
        onPanResponderMove: (_event, gesture) => {
          riseRef.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_event, gesture) => {
          release(Math.max(0, gesture.dy), gesture.vy);
        },
        onPanResponderTerminate: () => {
          settle();
        },
      }).panHandlers,
    [release, riseRef, settle],
  );

  return { panHandlers, rise: riseRef, heightRef };
}

function InlinePicker({ title, onClose, onConfirm, children }: InlinePickerProps) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createActionSheetStyles(theme);
  const insets = useSafeAreaInsets();
  // The picker commits only via `Listo`; dismissal (X, scrim, back, drag)
  // cancels and preserves the previously committed value.
  const drag = useSheetDragDismiss({ dismissible: () => true, onSheetDismissed: onClose });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.inlineOverlay}>
        <Pressable
          style={styles.backdropDismiss}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={`Cerrar ${title}`}
        />
        <Animated.View
          style={[styles.inlinePanel, { transform: [{ translateY: drag.rise }] }]}
          onLayout={(event) => {
            drag.heightRef.current = event.nativeEvent.layout.height;
          }}
          accessibilityViewIsModal
        >
          <View style={styles.inlineChrome} {...drag.panHandlers}>
            <View style={styles.handle} />
            <View style={styles.inlineHeader}>
              <AppButton variant="icon" size="sm" onPress={onClose} accessibilityLabel={`Cerrar ${title}`}><HomePlusIcon name="close" size={20} color={colors.text.secondary} /></AppButton>
              <AppText variant="title3" weight="800" style={styles.inlineTitle}>{title}</AppText>
              <AppButton title="Listo" size="sm" onPress={onConfirm} accessibilityLabel={`Confirmar ${title}`} />
            </View>
          </View>
          <View style={styles.inlineContent}>{children}</View>
          <View style={{ height: Math.max(insets.bottom, 16) }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

export type ActionSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onRequestClose: () => void;
  closeDisabled?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * `content` follows the natural height of a short sheet. `scrollable-content`
   * keeps that behavior until the safe viewport is reached, and `near-full` is
   * reserved for catalog-like surfaces that need a stable scrolling viewport.
   */
  size?: 'full' | 'content' | 'scrollable-content' | 'near-full';
  /**
   * Opt-in keyboard composition. Wraps the sheet in a `KeyboardAvoidingView` so
   * the footer (the primary CTA) stays reachable while the keyboard is open,
   * and makes the FIRST backdrop tap dismiss the keyboard instead of closing
   * the sheet — the standard iOS behaviour, so "tap outside the input" can
   * never destroy what the user was writing.
   */
  keyboardAware?: boolean;
  /** Opt-in explicit open/close motion. Existing consumers keep native slide. */
  transition?: 'native' | 'controlled';
  openDurationMs?: number;
  closeDurationMs?: number;
  onDidDismiss?: () => void;
  topRadius?: number;
  horizontalPadding?: number;
};

export function ActionSheet({ visible, title, subtitle, onRequestClose, closeDisabled = false, children, footer, size = 'full', keyboardAware = false, transition = 'native', openDurationMs = 220, closeDurationMs = 190, onDidDismiss, topRadius, horizontalPadding }: ActionSheetProps) {
  const theme = useAppTheme();
  const { colors, spacing } = theme;
  const styles = createActionSheetStyles(theme);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const keyboardVisible = useKeyboardVisible();
  const reducedMotion = useReducedMotion();
  const [controlledMounted, setControlledMounted] = useState(visible);
  const controlledProgress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const onDidDismissRef = useRef(onDidDismiss);
  onDidDismissRef.current = onDidDismiss;
  useEffect(() => {
    if (transition !== 'controlled') return;
    if (visible) {
      setControlledMounted(true);
      Animated.timing(controlledProgress, {
        toValue: 1,
        duration: reducedMotion ? 0 : openDurationMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!controlledMounted) return;
    Animated.timing(controlledProgress, {
      toValue: 0,
      duration: reducedMotion ? 0 : closeDurationMs,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setControlledMounted(false);
        onDidDismissRef.current?.();
      }
    });
  }, [visible, transition, controlledMounted, controlledProgress, reducedMotion, openDurationMs, closeDurationMs]);
  // Leave a real top breathing room instead of choosing a device-specific sheet
  // height. Short sheets stay intrinsic; only catalog surfaces claim this space.
  const safeSheetHeight = Math.max(360, Math.round(height * 0.9) - insets.top);
  const sheetSizing = size === 'near-full' || size === 'full'
    ? { height: safeSheetHeight, paddingBottom: Math.max(insets.bottom, spacing[4]) }
    : { maxHeight: safeSheetHeight, paddingBottom: Math.max(insets.bottom, spacing[4]) };
  const contentStyle = size === 'near-full' || size === 'full'
    ? styles.modalContentFill
    : size === 'scrollable-content'
      ? styles.modalContentScrollable
      : styles.modalContentIntrinsic;
  const requestClose = () => {
    if (!closeDisabled) onRequestClose();
  };
  // Handle + header strip is an honest drag affordance: it moves the sheet and
  // can dismiss it. Dismissal is disabled exactly when close is disabled.
  const drag = useSheetDragDismiss({ dismissible: () => !closeDisabled, onSheetDismissed: () => onRequestClose() });
  // With the keyboard up, the backdrop is a "tap outside the input" gesture:
  // it dismisses the keyboard and leaves the sheet (and its CTA) untouched.
  const handleBackdropPress = () => {
    if (keyboardAware && keyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    requestClose();
  };
  const controlledTranslate = transition === 'controlled'
    ? controlledProgress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] })
    : 0;
  const sheet = (
    <Animated.View
      style={[styles.modalSheet, sheetSizing, topRadius === undefined ? null : { borderTopLeftRadius: topRadius, borderTopRightRadius: topRadius }, horizontalPadding === undefined ? null : { paddingHorizontal: horizontalPadding }, { transform: [{ translateY: Animated.add(drag.rise, controlledTranslate) }] }]}
      onLayout={(event) => {
        drag.heightRef.current = event.nativeEvent.layout.height;
      }}
      accessibilityViewIsModal
    >
      <View style={styles.sheetChrome} {...drag.panHandlers}>
        <View style={styles.handle} />
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}><AppText variant="title2" weight="800">{title}</AppText>{subtitle ? <AppText variant="caption" tone="secondary">{subtitle}</AppText> : null}</View>
          <AppButton variant="icon" size="sm" onPress={requestClose} disabled={closeDisabled} accessibilityLabel={`Cerrar ${title}`}><HomePlusIcon name="close" size={20} color={colors.text.secondary} /></AppButton>
        </View>
      </View>
      <View style={contentStyle}>{children}</View>
      {footer ? <View style={styles.modalFooter}>{footer}</View> : null}
    </Animated.View>
  );
  return (
    <Modal visible={transition === 'controlled' ? controlledMounted : visible} transparent animationType={transition === 'controlled' ? 'none' : 'slide'} onRequestClose={requestClose} onDismiss={transition === 'native' ? onDidDismiss : undefined}>
      <Animated.View style={[styles.modalOverlay, transition === 'controlled' ? { opacity: controlledProgress } : null]}>
        <Pressable
          style={styles.backdropDismiss}
          onPress={handleBackdropPress}
          disabled={closeDisabled}
          accessibilityRole="button"
          accessibilityLabel={`Cerrar ${title}`}
        />
        {keyboardAware ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoiding} pointerEvents="box-none">
            {sheet}
          </KeyboardAvoidingView>
        ) : sheet}
      </Animated.View>
    </Modal>
  );
}

export function FormActionRow({ label, value, onPress, accessibilityLabel, disabled }: { label: string; value: string; onPress: () => void; accessibilityLabel?: string; disabled?: boolean }) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createActionSheetStyles(theme);

  return (
    <InteractivePressable style={styles.actionRow} onPress={() => { Keyboard.dismiss(); onPress(); }} disabled={disabled} haptic="light" pressScale={motion.scale.card} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}>
      <AppText variant="bodySmall" weight="700" style={{ flex: 1 }}>{label}</AppText>
      <AppText variant="bodySmall" tone="secondary" numberOfLines={1} style={styles.actionRowValue}>{value}</AppText>
      <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
    </InteractivePressable>
  );
}

/**
 * HomePlus monthly date picker (Phase 0 decision: custom calendar, not an
 * OS-native picker).
 *
 * Lifecycle contract:
 * - opening creates a TEMPORARY draft from the committed value;
 * - month navigation never commits anything;
 * - `Listo` commits; dismissal (X / scrim / back / drag) preserves the
 *   previously committed value;
 * - when `onClear` is provided the field accepts an empty date and the picker
 *   offers a discreet way to clear it, without quick-action clutter in the
 *   parent form.
 */
export function DatePickerSheet({ visible, value, onClose, onConfirm, onClear }: { visible: boolean; value: string; onClose: () => void; onConfirm: (value: string) => void; onClear?: () => void }) {
  const theme = useAppTheme();
  const { colors, spacing } = theme;
  const styles = createActionSheetStyles(theme);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [value, visible]);
  const markedDates = useMemo(() => {
    // LOCAL civil today — `toISOString()` shifts the day after 21:00 in UTC-3.
    const today = todayYMD();
    return {
      [today]: { marked: true, dotColor: colors.terracotta[600] },
      [draft]: { selected: true, selectedColor: colors.terracotta[500], selectedTextColor: colors.text.inverse },
    };
  }, [colors.terracotta, colors.text.inverse, draft]);
  if (!visible) return null;
  return (
    <InlinePicker title="Seleccionar fecha" onClose={onClose} onConfirm={() => onConfirm(draft)}>
      <Calendar
        current={draft || undefined}
        markedDates={markedDates}
        onDayPress={(day) => { setDraft(day.dateString); selectionHaptic(); }}
        enableSwipeMonths
        firstDay={1}
        theme={{ backgroundColor: colors.background.base, calendarBackground: colors.background.base, textSectionTitleColor: colors.text.tertiary, monthTextColor: colors.text.primary, arrowColor: colors.terracotta[600], dayTextColor: colors.text.primary, todayTextColor: colors.terracotta[700], textDisabledColor: colors.text.muted, textDayFontWeight: '600', textMonthFontWeight: '800', textDayHeaderFontWeight: '700' }}
        accessibilityLabel={`Calendario. Fecha seleccionada: ${formatHumanDate(draft)}`}
      />
      <AppText variant="bodySmall" tone="secondary" align="center" style={{ marginTop: spacing[4] }}>{formatHumanDate(draft)}</AppText>
      {onClear ? (
        <Pressable
          style={styles.clearRow}
          onPress={() => { warningHaptic(); onClear(); }}
          accessibilityRole="button"
          accessibilityLabel="Quitar fecha"
        >
          <AppText variant="bodySmall" weight="700" tone="secondary">Quitar fecha</AppText>
        </Pressable>
      ) : null}
    </InlinePicker>
  );
}

/**
 * One wheel column of the HomePlus time picker (Phase 0 decision: custom
 * two-wheel selector inspired by iOS, not an OS-native picker).
 *
 * Snap model: FlatList + `snapToInterval` (native, reliable alignment) with
 * selection derived from the settled offset only. Tapping an item scrolls the
 * list to it FIRST so the visual selection and the scroll position can never
 * disagree (the old version changed the value without scrolling, and the
 * next drag silently reverted it).
 */
function WheelColumn({ values, selected, onSelect, accessibilityLabel }: { values: number[]; selected: number; onSelect: (value: number) => void; accessibilityLabel: string }) {
  const theme = useAppTheme();
  const styles = createActionSheetStyles(theme);
  const listRef = useRef<FlatList<number>>(null);
  const initialIndex = Math.max(0, values.indexOf(selected));
  const selectOffset = (offset: number) => {
    const index = Math.round(offset / WHEEL_ITEM_HEIGHT);
    const next = values[Math.max(0, Math.min(index, values.length - 1))];
    if (next !== selected) { onSelect(next); selectionHaptic(); }
  };
  const selectByTap = (item: number, index: number) => {
    if (item === selected) return;
    listRef.current?.scrollToIndex({ index, animated: true });
    onSelect(item);
    selectionHaptic();
  };
  return <View style={styles.wheelColumn}><FlatList ref={listRef} data={values} keyExtractor={(item) => String(item)} getItemLayout={(_, index) => ({ length: WHEEL_ITEM_HEIGHT, offset: WHEEL_ITEM_HEIGHT * index, index })} initialScrollIndex={initialIndex} showsVerticalScrollIndicator={false} nestedScrollEnabled disableIntervalMomentum snapToInterval={WHEEL_ITEM_HEIGHT} decelerationRate="fast" contentContainerStyle={styles.wheelContent} accessibilityRole="adjustable" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min: values[0], max: values[values.length - 1], now: selected, text: `${accessibilityLabel} ${String(selected).padStart(2, '0')}` }} onMomentumScrollEnd={(event) => selectOffset(event.nativeEvent.contentOffset.y)} onScrollEndDrag={(event) => selectOffset(event.nativeEvent.contentOffset.y)} renderItem={({ item, index }) => <Pressable onPress={() => selectByTap(item, index)} style={styles.wheelItem} accessibilityRole="button" accessibilityLabel={`${accessibilityLabel} ${String(item).padStart(2, '0')}`} accessibilityState={{ selected: item === selected }}><AppText variant="title3" weight={item === selected ? '800' : '400'} tone={item === selected ? 'primary' : 'tertiary'}>{String(item).padStart(2, '0')}</AppText></Pressable>} /></View>;
}

export function TimePickerSheet({ visible, value, onClose, onConfirm }: { visible: boolean; value: string; onClose: () => void; onConfirm: (value: string) => void }) {
  const theme = useAppTheme();
  const { spacing } = theme;
  const styles = createActionSheetStyles(theme);
  const [hours, minutes] = value.split(':').map(Number);
  const [draftHour, setDraftHour] = useState(Number.isInteger(hours) ? hours : 9);
  const [draftMinute, setDraftMinute] = useState(Number.isInteger(minutes) ? minutes : 0);
  useEffect(() => {
    if (!visible) return;
    setDraftHour(Number.isInteger(hours) ? hours : 9);
    // Keep the EXACT committed minute in the draft: a value like 09:03 must
    // survive untouched if the user opens the picker and presses Listo without
    // scrolling. The wheel below adds the off-grid minute to its values so the
    // visual selection is honest; the first real interaction snaps back to
    // the 5-minute grid.
    setDraftMinute(Number.isInteger(minutes) ? minutes : 0);
  }, [hours, minutes, visible]);
  const hourValues = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);
  const minuteValues = useMemo(() => buildMinuteWheelValues(Number.isInteger(minutes) ? minutes : null), [minutes]);
  if (!visible) return null;
  return <InlinePicker title="Seleccionar hora" onClose={onClose} onConfirm={() => onConfirm(`${String(draftHour).padStart(2, '0')}:${String(draftMinute).padStart(2, '0')}`)}><View style={styles.wheelRow}><View style={styles.wheelFrame} pointerEvents="none" /><WheelColumn values={hourValues} selected={draftHour} onSelect={setDraftHour} accessibilityLabel="Hora" /><AppText variant="title2" weight="800">:</AppText><WheelColumn values={minuteValues} selected={draftMinute} onSelect={setDraftMinute} accessibilityLabel="Minutos" /></View><AppText variant="bodySmall" tone="secondary" align="center" style={{ marginTop: spacing[4] }}>{`${String(draftHour).padStart(2, '0')}:${String(draftMinute).padStart(2, '0')}`}</AppText></InlinePicker>;
}

const DURATION_QUICK_VALUES = [15, 30, 45, 60, 90, 120];

export function DurationPickerSheet({ visible, value, onClose, onConfirm }: { visible: boolean; value: number | null; onClose: () => void; onConfirm: (value: number | null) => void }) {
  const theme = useAppTheme();
  const { colors, spacing } = theme;
  const styles = createActionSheetStyles(theme);
  const [draft, setDraft] = useState<number | null>(value);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [value, visible]);

  const handleQuickSelect = (minutes: number) => {
    setDraft(minutes);
    selectionHaptic();
  };

  const handleCustomConfirm = () => {
    const minutes = parseInt(customMinutes, 10);
    if (Number.isInteger(minutes) && minutes >= 1 && minutes <= 10080) {
      setDraft(minutes);
      setShowCustom(false);
      setCustomMinutes('');
    }
  };

  if (!visible) return null;
  return (
    <InlinePicker title="Duración estimada" onClose={onClose} onConfirm={() => onConfirm(draft)}>
      <View style={styles.durationOptions}>
        {DURATION_QUICK_VALUES.map((minutes) => (
          <Pressable
            key={minutes}
            style={[styles.durationOption, draft === minutes && styles.durationOptionActive]}
            onPress={() => handleQuickSelect(minutes)}
            accessibilityRole="button"
            accessibilityState={{ selected: draft === minutes }}
            accessibilityLabel={`${minutes} minutos`}
          >
            <AppText variant="body" weight={draft === minutes ? '800' : '600'} tone={draft === minutes ? 'primary' : 'secondary'}>
              {minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60 ? minutes % 60 + 'min' : ''}`}
            </AppText>
          </Pressable>
        ))}
        <Pressable
          style={styles.durationOptionCustom}
          onPress={() => setShowCustom(true)}
          accessibilityRole="button"
          accessibilityLabel="Duración personalizada"
        >
          <HomePlusIcon name="pencil" size={18} color={colors.terracotta[600]} />
          <AppText variant="body" weight="600" tone="secondary">Personalizada</AppText>
        </Pressable>
      </View>

      {showCustom && (
        <View style={styles.customDurationInput}>
          <TextInput
            style={[styles.input, styles.customDurationTextInput]}
            value={customMinutes}
            onChangeText={setCustomMinutes}
            placeholder="Minutos (1-10080)"
            placeholderTextColor={colors.text.muted}
            keyboardType="numeric"
            autoFocus
          />
          <View style={styles.customDurationActions}>
            <AppButton variant="secondary" size="sm" title="Cancelar" onPress={() => { setShowCustom(false); setCustomMinutes(''); }} />
            <AppButton size="sm" title="Aceptar" onPress={handleCustomConfirm} />
          </View>
        </View>
      )}

      <AppText variant="bodySmall" tone="secondary" align="center" style={{ marginTop: spacing[4] }}>
        {draft ? (draft < 60 ? `${draft} min` : `${Math.floor(draft / 60)}h ${draft % 60 ? draft % 60 + 'min' : ''}`) : 'Sin duración'}
      </AppText>
    </InlinePicker>
  );
}

function createActionSheetStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, shadows, spacing, touchTargets } = theme;

  return StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.surface.overlay },
  backdropDismiss: { ...StyleSheet.absoluteFill, zIndex: 0 },
  modalSheet: { zIndex: 1, backgroundColor: colors.background.base, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingHorizontal: spacing[5], paddingTop: spacing[3], ...shadows.sheet },
  // Handle + header strip shared by ActionSheet and InlinePicker: the honest
  // drag zone of the sheet.
  sheetChrome: { flexShrink: 0 },
  handle: { width: 44, height: 4, borderRadius: radius.pill, backgroundColor: colors.border.strong, alignSelf: 'center', marginBottom: spacing[3] },
  modalHeader: { minHeight: touchTargets.normal, flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] },
  modalContentFill: { flex: 1, minHeight: 0 },
  modalContentIntrinsic: { flexShrink: 1, minHeight: 0 },
  modalContentScrollable: { flexGrow: 1, flexShrink: 1, minHeight: 0 },
  modalFooter: { flexShrink: 0, paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border.subtle },
  keyboardAvoiding: { flexShrink: 1, justifyContent: 'flex-end' },
  inlineOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.surface.overlay },
  // Compact adaptive panel: the picker sizes to its content (calendar ~340px,
  // wheels ~220px) instead of filling the whole screen.
  inlinePanel: { zIndex: 1, backgroundColor: colors.background.base, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingHorizontal: spacing[5], paddingTop: spacing[3], ...shadows.sheet },
  inlineChrome: { flexShrink: 0 },
  inlineHeader: { minHeight: touchTargets.normal, flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] },
  inlineTitle: { flex: 1, textAlign: 'center' },
  inlineContent: { flexShrink: 1, position: 'relative' },
  clearRow: { alignSelf: 'center', marginTop: spacing[2], minHeight: touchTargets.normal, paddingHorizontal: spacing[4], alignItems: 'center', justifyContent: 'center' },
  actionRow: { minHeight: 56, paddingHorizontal: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.soft, flexDirection: 'row', alignItems: 'center', gap: spacing[2] }, actionRowValue: { maxWidth: '58%', textAlign: 'right' },
  wheelRow: { height: WHEEL_ITEM_HEIGHT * 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[3] }, wheelFrame: { position: 'absolute', top: WHEEL_ITEM_HEIGHT * 2, left: 0, right: 0, height: WHEEL_ITEM_HEIGHT, zIndex: 1, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.terracotta[300], backgroundColor: colors.terracotta[50] }, wheelColumn: { width: 92, height: WHEEL_ITEM_HEIGHT * 5 }, wheelContent: { paddingVertical: WHEEL_ITEM_HEIGHT * 2 }, wheelItem: { height: WHEEL_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  durationOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], justifyContent: 'center', paddingHorizontal: spacing[2] },
  durationOption: { minWidth: 72, minHeight: 44, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.soft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  durationOptionActive: { backgroundColor: colors.terracotta[500], borderColor: colors.terracotta[500] },
  durationOptionCustom: { minWidth: 100, minHeight: 44, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.terracotta[100], backgroundColor: colors.terracotta[50], alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing[1], paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  customDurationInput: { gap: spacing[3], marginTop: spacing[3], paddingHorizontal: spacing[2] },
  customDurationTextInput: { minHeight: 48, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border.default, backgroundColor: colors.surface.card, paddingHorizontal: spacing[4], paddingVertical: spacing[3], color: colors.text.primary, fontSize: 18, textAlign: 'center' },
  customDurationActions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
  input: { minHeight: 46, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border.default, backgroundColor: colors.surface.card, paddingHorizontal: spacing[4], paddingVertical: spacing[3], color: colors.text.primary, fontSize: 15 },
  });
}

