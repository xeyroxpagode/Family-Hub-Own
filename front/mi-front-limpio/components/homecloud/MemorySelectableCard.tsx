import React, { useCallback, useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import {
  memoryPrimaryText,
  memorySemanticLabel,
} from '../../services/homecloud/homecloudMemoriesTimeline';
import type { HomeCloudMemoryListItem } from '../../services/homecloud/homecloudTypes';
import { AppText } from '../ui/AppText';
import { MemoryCard, type MemoryAlbumScopeAction } from './MemoryCards';

/**
 * HomeCloud MO-A3 — the Memory INTERACTION WRAPPER.
 *
 * `MemoryCard` stays exactly what it was: a product renderer, non-navigational
 * and Viewer-free. It is NOT turned into a state machine and it learns nothing
 * about selection. This wrapper owns the whole interaction policy instead:
 * tap, long press, the selection affordance, the gesture seams, the
 * accessibility contract and the layout registration the drag hit test needs.
 *
 * THE RESPONDER TRANSFER (the technically correct part)
 * -----------------------------------------------------
 * The touch ALWAYS starts before the long press arms the drag, so
 * `onStartShouldSetPanResponder` is never re-run after arming. This wrapper
 * therefore:
 *
 *   1. never claims the responder on touch start
 *      (`onStartShouldSetPanResponder -> false`), so normal scrolling is not
 *      stolen and a fast flick can never enter selection;
 *   2. arms ONLY from `onLongPress`;
 *   3. takes ownership in the MOVE phase via `onMoveShouldSetPanResponder`,
 *      and only while armed AND past a small slop, so a 1-2 px jitter right
 *      after the long press does not steal a scroll.
 *
 * That is the documented transition the pure module in
 * `homecloudMemoryDrag` describes, and it is why no capture handler is used.
 *
 * NORMAL MODE VS SELECTION MODE
 * -----------------------------
 * - normal: an ordinary tap keeps CURRENT behaviour (there is no Viewer yet, so
 *   it does nothing), and a long press asks the owner to enter selection with
 *   this Memory as the first one.
 * - selecting: a tap toggles, and a long press only ARMS the drag, so a plain
 *   vertical drag still scrolls the list while a held drag becomes a sweep.
 *
 * ACCESSIBILITY IS NOT THE GESTURE
 * --------------------------------
 * Long press and drag are never the only way in: every card is an accessible
 * button carrying `accessibilityState.selected` and a label that names the exact
 * action, so TalkBack / VoiceOver can toggle a Memory without any gesture.
 */

const KIND_LABEL: Readonly<Record<HomeCloudMemoryListItem['kind'], string>> = {
  image: 'Foto',
  video: 'Video',
  audio: 'Audio',
  written: 'Nota',
};

/**
 * px the finger must travel after arming before the drag claims the pointer.
 * Small enough that a selection sweep feels immediate, large enough that a
 * finger settling after the long press does not steal the scroll.
 */
export const MEMORY_DRAG_TAKEOVER_SLOP = 6;

export function memorySelectableCardLabel(
  memory: HomeCloudMemoryListItem,
  input: { selecting: boolean; selected: boolean; unselectable: boolean },
): string {
  const primary = memoryPrimaryText(memory);
  const identity = primary.length > 0 ? `${primary}. ${memorySemanticLabel(memory)}` : memorySemanticLabel(memory);
  const base = `${KIND_LABEL[memory.kind]}: ${identity}`;
  if (!input.selecting) return `${base}. Mantené presionado para seleccionar`;
  if (input.unselectable) return `${base}. Ya está en el álbum`;
  return `${base}. ${input.selected ? 'Quitar de la selección' : 'Seleccionar'}`;
}

export function MemorySelectableCard({
  memory,
  accessToken,
  selecting,
  selected,
  unselectable,
  disabled,
  albumScopeAction,
  onToggle,
  onLongPress,
  onDragArm,
  onDragMove,
  onDragEnd,
  onLayout,
  measureCell,
}: {
  memory: HomeCloudMemoryListItem;
  accessToken: string | null;
  selecting: boolean;
  selected: boolean;
  /** Already in the destination Album: visible, marked, never selectable. */
  unselectable: boolean;
  /** A mutation is in flight; interaction is frozen but visuals are honest. */
  disabled?: boolean;
  /**
   * MO-A2's ONE contextual Album action, forwarded untouched to `MemoryCard`.
   *
   * It is supplied ONLY by the Album detail in NORMAL mode: while the Selection
   * Mode is active the caller omits it, because a per-tile button underneath a
   * drag is a competing tap target, not a feature.
   */
  albumScopeAction?: MemoryAlbumScopeAction;
  onToggle: (contentId: string) => void;
  onLongPress: (contentId: string) => void;
  /** Called with the arming card so the owner can start a drag from it. */
  onDragArm: (contentId: string, isSelected: boolean) => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragEnd: () => void;
  onLayout?: () => void;
  /**
   * Measure THIS card's bounds for the drag hit test. The owner owns the
   * measurement abstraction, so the card only offers its node.
   */
  measureCell?: (node: View | null) => void;
}) {
  const armedRef = useRef(false);
  const nodeRef = useRef<View | null>(null);
  const contentId = memory.id;

  // One PanResponder per MOUNTED card. It is created once per card and only
  // asks for the responder while armed, so a row that was never held can never
  // take a pointer away from the list.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          armedRef.current && Math.abs(gesture.dx) + Math.abs(gesture.dy) >= MEMORY_DRAG_TAKEOVER_SLOP,
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderGrant: (event) => {
          const { pageX, pageY } = event.nativeEvent;
          onDragMove(pageX, pageY);
        },
        onPanResponderMove: (event) => {
          const { pageX, pageY } = event.nativeEvent;
          onDragMove(pageX, pageY);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderTerminate: () => {
          armedRef.current = false;
          onDragEnd();
        },
        onPanResponderRelease: () => {
          armedRef.current = false;
          onDragEnd();
        },
        onPanResponderEnd: () => {
          armedRef.current = false;
        },
      }),
    [onDragEnd, onDragMove],
  );

  const handleLongPress = useCallback(() => {
    armedRef.current = true;
    // In normal mode this ENTERS selection (with this Memory first); in
    // selection mode it only arms, so the sweep keeps the existing selection.
    onLongPress(contentId);
    onDragArm(contentId, selected);
  }, [contentId, onDragArm, onLongPress, selected]);

  const handlePress = useCallback(() => {
    // An already-in-destination Memory stays visible and NOT toggleable.
    if (!selecting || unselectable) return;
    onToggle(contentId);
  }, [contentId, onToggle, selecting, unselectable]);

  const handleLayout = useCallback(() => {
    onLayout?.();
  }, [onLayout]);

  const handleRef = useCallback(
    (node: View | null) => {
      nodeRef.current = node;
      measureCell?.(node);
    },
    [measureCell],
  );

  const label = memorySelectableCardLabel(memory, { selecting, selected, unselectable });

  return (
    <View
      ref={handleRef}
      style={styles.cell}
      onLayout={handleLayout}
      collapsable={false}
      {...panResponder.panHandlers}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected, disabled: disabled === true }}
        style={styles.pressable}
      >
        <MemoryCard memory={memory} accessToken={accessToken} albumScopeAction={albumScopeAction} />
      </Pressable>
      {selecting ? (
        <>
          <View style={styles.status} pointerEvents="none" importantForAccessibility="no-hide-descendants">
            <View style={[styles.badge, unselectable ? styles.badgeMember : selected ? styles.badgeSelected : styles.badgeIdle]}>
              {unselectable || selected ? (
                <HomePlusIcon name="checkmark" size={13} color={unselectable ? colors.text.secondary : colors.text.inverse} />
              ) : null}
            </View>
          </View>
          {selected ? (
            // A second, NON-COLOR cue: the selection is a ring around the tile,
            // not only a hue change, so it survives a colour-blind reader and a
            // grayscale screenshot.
            <View pointerEvents="none" style={styles.ring} />
          ) : null}
          {unselectable ? (
            <View pointerEvents="none">
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {'Ya está en el álbum'}
              </AppText>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, gap: spacing[1] },
  pressable: { flex: 1 },
  status: { position: 'absolute', top: spacing[1], left: spacing[1], zIndex: 2 },
  badge: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badgeIdle: { backgroundColor: 'rgba(255,255,255,0.86)', borderColor: colors.border.strong },
  badgeSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  badgeMember: { backgroundColor: 'rgba(255,255,255,0.86)', borderColor: colors.border.default },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.brand,
  },
});