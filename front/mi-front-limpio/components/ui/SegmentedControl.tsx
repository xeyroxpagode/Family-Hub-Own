import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '../../context/AppThemeContext';
import { AppText } from './AppText';
import { InteractivePressable } from './InteractivePressable';
import { getSelectedRuns, toggleSegmentValue, type SelectedRun } from './segmentedControlModel';

export { getSelectedRuns, toggleSegmentValue, type SelectedRun } from './segmentedControlModel';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
};

type SharedProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  style?: StyleProp<ViewStyle>;
  size?: 'regular' | 'compact';
  fullWidth?: boolean;
  iconsOnly?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

export type SegmentedControlSingleProps<T extends string> = SharedProps<T> & {
  selectionMode?: 'single';
  value: T;
  onChange: (value: T) => void;
};

export type SegmentedControlMultipleProps<T extends string> = SharedProps<T> & {
  selectionMode: 'multiple';
  value: readonly T[];
  onChange: (value: T[]) => void;
};

export type SegmentedControlProps<T extends string> = SegmentedControlSingleProps<T> | SegmentedControlMultipleProps<T>;
type SegmentLayout = { x: number; width: number };
type RunGeometry = SelectedRun & { key: string; left: number; width: number };

function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reduceMotion;
}

function AnimatedRun({ run, source, reduceMotion, duration, color, borderColor, radius, inset }: {
  run: RunGeometry;
  source?: { left: number; width: number };
  reduceMotion: boolean;
  duration: number;
  color: string;
  borderColor: string;
  radius: number;
  inset: number;
}) {
  const left = useRef(new Animated.Value(source?.left ?? run.left)).current;
  const width = useRef(new Animated.Value(source?.width ?? run.width)).current;

  useEffect(() => {
    left.stopAnimation();
    width.stopAnimation();
    if (reduceMotion) {
      left.setValue(run.left);
      width.setValue(run.width);
      return;
    }
    Animated.parallel([
      Animated.timing(left, { toValue: run.left, duration, useNativeDriver: false }),
      Animated.timing(width, { toValue: run.width, duration, useNativeDriver: false }),
    ]).start();
  }, [duration, left, reduceMotion, run.left, run.width, width]);

  return (
    <Animated.View
      pointerEvents="none"
      testID={`segmented-active-run-${run.start}-${run.end}`}
      style={{ position: 'absolute', top: inset, bottom: inset, left, width, borderRadius: radius, backgroundColor: color, borderWidth: 1, borderColor }}
    />
  );
}

/** Canonical selection primitive extracted from Family's Personas / Mapa control. */
export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  const { colors, motion, radius, spacing } = useAppTheme();
  const {
    options, style, size = 'compact', fullWidth = true, iconsOnly = false,
    disabled = false, testID, accessibilityLabel,
  } = props;
  const selectionMode = props.selectionMode ?? 'single';
  const compact = size === 'compact';
  const inset = compact ? 2 : spacing[1];
  const reduceMotion = useReduceMotion();
  const [layouts, setLayouts] = useState<Record<number, SegmentLayout>>({});

  const selectedKey = (selectionMode === 'multiple'
    ? [...(props as SegmentedControlMultipleProps<T>).value]
    : [(props as SegmentedControlSingleProps<T>).value]
  ).sort().join('\u0000');
  const selectedFlags = useMemo(
    () => {
      const selectedValues = new Set(selectedKey ? selectedKey.split('\u0000') : []);
      return options.map((option) => selectedValues.has(option.value));
    },
    [options, selectedKey],
  );
  const layoutReady = options.length > 0 && options.every((_, index) => layouts[index]);
  const runGeometries = useMemo<RunGeometry[]>(() => layoutReady
    ? getSelectedRuns(selectedFlags).map((run) => {
        const first = layouts[run.start];
        const last = layouts[run.end];
        return { ...run, key: `${run.start}-${run.end}`, left: first.x, width: last.x + last.width - first.x };
      })
    : [], [layoutReady, layouts, selectedFlags]);
  const previousRuns = useRef<RunGeometry[]>([]);
  const sources = runGeometries.map((run) => {
    if (selectionMode === 'single' && previousRuns.current[0]) {
      return { left: previousRuns.current[0].left, width: previousRuns.current[0].width };
    }
    const overlaps = previousRuns.current.filter((previous) => previous.end >= run.start && previous.start <= run.end);
    if (overlaps.length === 0) return { left: run.left + run.width / 2, width: 0 };
    const left = Math.min(...overlaps.map((candidate) => candidate.left));
    const right = Math.max(...overlaps.map((candidate) => candidate.left + candidate.width));
    return { left, width: right - left };
  });

  useEffect(() => { previousRuns.current = runGeometries; }, [runGeometries]);

  const recordLayout = (index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setLayouts((current) => {
      const previous = current[index];
      if (previous?.x === x && previous.width === width) return current;
      return { ...current, [index]: { x, width } };
    });
  };

  const choose = (option: SegmentOption<T>) => {
    if (disabled || option.disabled) return;
    if (selectionMode === 'multiple') {
      const current = (props as SegmentedControlMultipleProps<T>).value;
      const next = toggleSegmentValue(current, option.value);
      (props as SegmentedControlMultipleProps<T>).onChange(next);
    } else {
      (props as SegmentedControlSingleProps<T>).onChange(option.value);
    }
  };

  return (
    <View
      accessibilityRole={selectionMode === 'single' ? 'radiogroup' : undefined}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[
        styles.track,
        {
          minHeight: compact ? 44 : 52,
          padding: inset,
          borderRadius: radius.full,
          backgroundColor: colors.background.soft,
          borderColor: colors.border.subtle,
          gap: selectionMode === 'single' ? (compact ? 2 : spacing[1]) : 0,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {runGeometries.map((run, index) => (
        <AnimatedRun key={run.key} run={run} source={sources[index]} reduceMotion={reduceMotion}
          duration={motion.navActive} color={colors.surface.card} borderColor={colors.border.default} radius={radius.full} inset={inset} />
      ))}
      {options.map((option, index) => {
        const selected = selectedFlags[index];
        const optionDisabled = disabled || option.disabled === true;
        return (
          <InteractivePressable
            key={option.value}
            onLayout={(event) => recordLayout(index, event)}
            accessibilityRole={selectionMode === 'single' ? 'radio' : 'checkbox'}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected, checked: selectionMode === 'multiple' ? selected : undefined, disabled: optionDisabled }}
            disabled={optionDisabled}
            onPress={() => choose(option)}
            haptic="light"
            pressScale={motion.scale.button}
            pressedOpacity={0.85}
            style={[styles.option, { minHeight: compact ? 40 : 44, paddingHorizontal: compact ? spacing[2] : spacing[3], flex: fullWidth ? 1 : undefined, opacity: optionDisabled ? 0.5 : 1 }]}
          >
            {option.icon ? <View style={iconsOnly ? undefined : styles.icon}>{option.icon}</View> : null}
            {!iconsOnly ? <AppText variant="bodySmall" tone={selected ? 'brand' : 'secondary'} weight="600" numberOfLines={1}>{option.label}</AppText> : null}
          </InteractivePressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', position: 'relative', borderWidth: 1, overflow: 'hidden' },
  option: { minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  icon: { marginRight: 6 },
});
