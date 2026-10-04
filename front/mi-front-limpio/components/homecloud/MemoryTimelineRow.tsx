import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../constants/theme';
import type { MemoryCellHitZone, MemoryRect } from '../../services/homecloud/homecloudMemoryDrag';
import type { HomeCloudMemoryListItem } from '../../services/homecloud/homecloudTypes';
import { MemorySelectableCard } from './MemorySelectableCard';

/**
 * HomeCloud MO-A3 — the Memory TIMELINE ROW.
 *
 * A row exists for three reasons, and only three:
 *
 *   1. MEASUREMENT. Rows have variable height (a Written tile, or any tile with
 *      the already-member caption, is taller than a plain image tile), so the
 *      drag hit test can never assume a fixed cell height. This row measures its
 *      OWN bounds — and each cell's bounds — through the owner's measurement
 *      abstraction and publishes them to the mounted-row registry.
 *   2. MOUNTED-ROW REGISTRATION. Only mounted rows are ever registered, so a
 *      virtualized cell that scrolls away cannot leave a stale hit zone behind.
 *   3. BOUNDED RE-RENDERS (see the comparator at the bottom of this file).
 */

/**
 * Per-card selection state, DERIVED BY THE OWNER.
 *
 * §17 is explicit that the whole `selectedIds` Set must not be handed to every
 * row: the owner derives these primitives once per render and the row only ever
 * reads `selected` / `unselectable` for the card it is rendering.
 */
export interface MemoryTimelineCell {
  readonly contentId: string;
  readonly selected: boolean;
  readonly unselectable: boolean;
}

export interface MemoryTimelineRowProps {
  rowKey: string;
  items: readonly HomeCloudMemoryListItem[];
  /** `contentId` order MUST match `items`. */
  cells: readonly MemoryTimelineCell[];
  accessToken: string | null;
  columns: number;
  selecting: boolean;
  /**
   * Publish bounds to the registry. It is FALSE outside selection mode: the drag
   * hit test only exists while a sweep can happen, so the normal Timeline pays
   * no measurement cost and its rows are never flattened away by the
   * `collapsable={false}` a measurement needs.
   */
  measureRows: boolean;
  disabled?: boolean;
  onToggle: (contentId: string) => void;
  onLongPress: (contentId: string) => void;
  onDragArm: (contentId: string, isSelected: boolean) => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragEnd: () => void;
  /**
   * Publish / refresh this row's registry entry.
   *
   * The SAME entry object is handed back to `unregisterRow` on unmount, so the
   * owner can delete by identity. That is what makes the registry safe across a
   * surface change: the outgoing list's passive cleanup can run AFTER the
   * incoming list already registered a row with the same key, and an
   * identity-guarded delete leaves the live entry alone instead of silently
   * punching a hole in the hit test.
   */
  registerRow: (entry: MemoryTimelineRowEntry) => void;
  unregisterRow: (entry: MemoryTimelineRowEntry) => void;
}

export interface MemoryTimelineRowEntry {
  readonly rowKey: string;
  /** Null while the row is mounted but not measurable yet: NOT hit-testable. */
  readonly bounds: MemoryRect | null;
  readonly cells: readonly MemoryCellHitZone[];
}

function MemoryTimelineRowImpl({
  rowKey,
  items,
  cells,
  accessToken,
  columns,
  selecting,
  measureRows,
  disabled,
  onToggle,
  onLongPress,
  onDragArm,
  onDragMove,
  onDragEnd,
  registerRow,
  unregisterRow,
}: MemoryTimelineRowProps) {
  const rowRef = useRef<View | null>(null);
  const cellRefs = useRef(new Map<string, View>());
  // The layout identity of the last published entry: re-publishing an identical
  // entry would churn the owner on every render for no reason.
  const publishedRef = useRef<string>('');
  // The exact object last handed to the owner, so the unmount cleanup can
  // delete BY IDENTITY and never remove somebody else's live entry.
  const entryRef = useRef<MemoryTimelineRowEntry | null>(null);

  const measureCell = useCallback(
    (contentId: string) => (node: View | null) => {
      if (node === null) cellRefs.current.delete(contentId);
      else cellRefs.current.set(contentId, node);
    },
    [],
  );

  const publish = useCallback(() => {
    const row = rowRef.current;
    if (row === null || typeof row.measureInWindow !== 'function') return;
    row.measureInWindow((x, y, width, height) => {
      if (rowRef.current === null || width <= 0 || height <= 0) return;
      const measured: MemoryCellHitZone[] = [];
      for (const item of items) {
        const node = cellRefs.current.get(item.id);
        if (node === null || node === undefined || typeof node.measureInWindow !== 'function') continue;
        node.measureInWindow((cellX, cellY, cellWidth, cellHeight) => {
          measured.push({
            contentId: item.id,
            bounds: { x: cellX, y: cellY, width: cellWidth, height: cellHeight },
          });
        });
      }
      const signature = [
        Math.round(x),
        Math.round(y),
        Math.round(width),
        Math.round(height),
        measured.length,
        ...measured.map(
          (cell) =>
            `${cell.contentId}:${Math.round(cell.bounds.x)},${Math.round(cell.bounds.y)},${Math.round(cell.bounds.width)},${Math.round(cell.bounds.height)}`,
        ),
      ].join('|');
      if (signature === publishedRef.current && entryRef.current !== null) return;
      publishedRef.current = signature;
      const entry: MemoryTimelineRowEntry = { rowKey, bounds: { x, y, width, height }, cells: measured };
      entryRef.current = entry;
      registerRow(entry);
    });
  }, [items, registerRow, rowKey]);

  const handleRowLayout = useCallback(() => {
    if (!measureRows) return;
    publish();
  }, [measureRows, publish]);

  // A row that UNMOUNTS must remove its entry: the registry holds mounted rows
  // only, which is what keeps virtualization from producing phantom hit zones.
  useEffect(
    () => () => {
      publishedRef.current = '';
      cellRefs.current.clear();
      const entry = entryRef.current;
      entryRef.current = null;
      if (entry !== null) unregisterRow(entry);
    },
    [unregisterRow],
  );

  const spacers = Math.max(0, columns - items.length);

  return (
    <View ref={rowRef} style={styles.row} onLayout={handleRowLayout} collapsable={false}>
      {items.map((memory, index) => {
        const cell = cells[index];
        return (
          <MemorySelectableCard
            key={memory.id}
            memory={memory}
            accessToken={accessToken}
            selecting={selecting}
            selected={cell?.selected ?? false}
            unselectable={cell?.unselectable ?? false}
            disabled={disabled}
            onToggle={onToggle}
            onLongPress={onLongPress}
            onDragArm={onDragArm}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            measureCell={measureCell(memory.id)}
          />
        );
      })}
      {Array.from({ length: spacers }).map((_, index) => (
        <View key={`spacer-${index}`} style={styles.spacer} />
      ))}
    </View>
  );
}

/**
 * COMPARE DATA, NOT SEAMS.
 *
 * A selection toggle changes ONE Memory, and only the row containing it may
 * re-render. A shallow compare would fail on every row because the derived
 * `cells` array is a fresh object each pass, so the comparator walks the cells
 * and compares the primitives that actually decide what a row renders.
 *
 * It deliberately ignores the interaction seams and `registerRow`. That is safe
 * because they are STABLE `useCallback`s owned by the Memories subtree, which
 * read the live state through refs; if a seam ever stopped being stable, the
 * row would keep the previous one — so this contract is load-bearing and is
 * asserted by the MO-A3 gate rather than left to convention.
 */
function areRowPropsEqual(previous: MemoryTimelineRowProps, next: MemoryTimelineRowProps): boolean {
  if (previous.rowKey !== next.rowKey) return false;
  if (previous.selecting !== next.selecting) return false;
  if (previous.disabled !== next.disabled) return false;
  if (previous.accessToken !== next.accessToken) return false;
  if (previous.columns !== next.columns) return false;
  if (previous.measureRows !== next.measureRows) return false;
  if (previous.items !== next.items) return false;
  if (previous.cells.length !== next.cells.length) return false;
  for (let index = 0; index < previous.cells.length; index += 1) {
    const before = previous.cells[index];
    const after = next.cells[index];
    if (after === undefined) return false;
    if (before.contentId !== after.contentId) return false;
    if (before.selected !== after.selected) return false;
    if (before.unselectable !== after.unselectable) return false;
  }
  return true;
}

export const MemoryTimelineRow = React.memo(MemoryTimelineRowImpl, areRowPropsEqual);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] },
  spacer: { flex: 1 },
});