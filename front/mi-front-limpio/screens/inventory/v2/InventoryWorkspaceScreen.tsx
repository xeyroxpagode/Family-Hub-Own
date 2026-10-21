import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import {
  AdaptiveActionMenu,
  AdaptiveMenuRow,
  AppButton,
  AppScreen,
  AppText,
  HorizontalPager,
  IconButton,
  SegmentedControl,
} from '../../../components/ui';
import { useBottomChrome } from '../../../context/BottomChromeContext';
import { colors, spacing } from '../../../constants/theme';
import { InventoryProductsPage } from './InventoryV2Screens';
import { InventoryShoppingPage } from './InventoryShoppingPurchaseScreens';

/**
 * Inventory workspace — the shared shell of Productos and Compras.
 *
 * Productos and Compras stop behaving like two sibling routes that mount and
 * unmount: they are two PAGES of one workspace. The shell (context header +
 * canonical selector) stays stable, the pager follows the finger 1:1 and every
 * page keeps its own local state (scroll, search, filters) because it stays
 * mounted.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §2.
 */

export type InventoryWorkspaceTab = 'products' | 'shopping';

export type InventoryWorkspaceAction = {
  id: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

/**
 * What a page declares about its selection mode.
 *
 * The workspace owns the header, so a page never renders its own header: it
 * declares the selection state and the workspace renders the selection header
 * in the SAME slot, so the geometry of the shell never changes.
 */
export type InventoryWorkspaceSelectionState = {
  count: number;
  /** Show the leading "leave selection" affordance. */
  showClose?: boolean;
  /** Handler of the leading affordance. */
  onExit?: () => void;
  /** Label of the trailing action, when the page offers one. */
  trailingLabel?: string;
  /** Handler of the trailing action. */
  onTrailingPress?: () => void;
};

/**
 * What a page may declare to the workspace.
 */
export type InventoryWorkspacePageProps = {
  /** Bumped by the workspace when the header `+` is pressed. */
  addNonce?: number;
  /** Declare the selection state (or `null` when the page leaves selection). */
  onSelectionStateChange?: (state: InventoryWorkspaceSelectionState | null) => void;
  /** Declare the actions of the header overflow for this page. */
  onOverflowActionsChange?: (actions: InventoryWorkspaceAction[]) => void;
};

const TAB_OPTIONS = [
  { value: 'products' as const, label: 'Productos' },
  { value: 'shopping' as const, label: 'Compras' },
];

const TAB_INDEX: Record<InventoryWorkspaceTab, number> = { products: 0, shopping: 1 };

function tabFromIndex(index: number): InventoryWorkspaceTab {
  return index === 1 ? 'shopping' : 'products';
}

export function InventoryWorkspaceScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  const chrome = useBottomChrome();

  const requestedTab: InventoryWorkspaceTab = route.params?.tab === 'shopping' ? 'shopping' : 'products';
  const [targetTab, setTargetTab] = useState<InventoryWorkspaceTab>(requestedTab);
  const [settledTab, setSettledTab] = useState<InventoryWorkspaceTab>(requestedTab);
  const [transitioning, setTransitioning] = useState(false);
  const [progress, setProgress] = useState(TAB_INDEX[requestedTab]);
  const [addNonce, setAddNonce] = useState(0);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: Math.max(0, width - 60), y: 16, width: 44, height: 44 });

  const overflowActionsRef = useRef<Record<InventoryWorkspaceTab, InventoryWorkspaceAction[]>>({
    products: [],
    shopping: [],
  });
  const selectionRef = useRef<Record<InventoryWorkspaceTab, InventoryWorkspaceSelectionState | null>>({
    products: null,
    shopping: null,
  });
  const [selection, setSelection] = useState<Record<InventoryWorkspaceTab, InventoryWorkspaceSelectionState | null>>({
    products: null,
    shopping: null,
  });
  const overflowButtonRef = useRef<View | null>(null);

  // A new explicit entry into Inventory always lands on the workspace root.
  useEffect(() => {
    if (!route.params?.tab) return;
    const next: InventoryWorkspaceTab = route.params.tab === 'shopping' ? 'shopping' : 'products';
    setTargetTab(next);
  }, [route.params?.tab]);

  // The Purchase flow opens the Shopping add sheet through a deep link param.
  useEffect(() => {
    const nonce = route.params?.openAddNonce;
    if (!nonce) return;
    setTargetTab('shopping');
    setAddNonce((current) => current + 1);
  }, [route.params?.openAddNonce]);

  // Products normal / Shopping normal own the bottom navigation.
  useEffect(() => {
    chrome.setSlot('bottom-nav');
  }, [chrome]);

  const declareOverflowActions = useCallback(
    (tab: InventoryWorkspaceTab) => (actions: InventoryWorkspaceAction[]) => {
      overflowActionsRef.current[tab] = actions;
    },
    [],
  );

  const declareSelection = useCallback(
    (tab: InventoryWorkspaceTab) => (state: InventoryWorkspaceSelectionState | null) => {
      const current = selectionRef.current[tab];
      // The ref always keeps the LATEST handlers, so a stale closure can never
      // reach the header; the state only carries what has to be rendered.
      selectionRef.current[tab] = state;
      const sameCount = (current?.count ?? 0) === (state?.count ?? 0);
      if (sameCount && Boolean(current) === Boolean(state)) return;
      setSelection((currentSelection) => ({
        ...currentSelection,
        [tab]: state
          ? { count: state.count, showClose: state.showClose, trailingLabel: state.trailingLabel }
          : null,
      }));
    },
    [],
  );

  const handleSelect = useCallback((value: InventoryWorkspaceTab) => {
    // The pager is the single authority of the progress: the selector follows
    // the live gesture and the settle animation from the pager itself.
    setTargetTab(value);
  }, []);

  const handleAdd = useCallback(() => {
    setAddNonce((current) => current + 1);
  }, []);

  const handleOverflow = useCallback(() => {
    const node = overflowButtonRef.current;
    if (!node) {
      setOverflowOpen(true);
      return;
    }
    node.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      setAnchor({ x, y, width: measuredWidth, height: measuredHeight });
      setOverflowOpen(true);
    });
  }, []);

  const settledSelection = selection[settledTab];
  const overflowActions = overflowActionsRef.current[settledTab] ?? [];

  const pages = useMemo(
    () => [
      <InventoryProductsPage
        key="products"
        addNonce={targetTab === 'products' ? addNonce : 0}
        onOverflowActionsChange={declareOverflowActions('products')}
        onSelectionStateChange={declareSelection('products')}
      />,
      <InventoryShoppingPage
        key="shopping"
        addNonce={targetTab === 'shopping' ? addNonce : 0}
        onOverflowActionsChange={declareOverflowActions('shopping')}
        onSelectionStateChange={declareSelection('shopping')}
      />,
    ],
    [addNonce, declareOverflowActions, declareSelection, targetTab],
  );

  const addAccessibilityLabel = settledTab === 'products' ? 'Agregar producto' : 'Agregar productos a la lista';

  return (
    <AppScreen padded={false} bottomInset="none" style={styles.screen}>
      <View style={styles.header}>
        {settledSelection ? (
          <>
            {settledSelection.showClose ? (
              <IconButton
                icon="close"
                variant="plain"
                onPress={() => selectionRef.current[settledTab]?.onExit?.()}
                accessibilityLabel="Salir de selección"
              />
            ) : null}
            <AppText variant="title3" weight="700" style={styles.selectionTitle}>
              {settledSelection.count} seleccionados
            </AppText>
            {settledSelection.trailingLabel ? (
              <AppButton
                title={settledSelection.trailingLabel}
                size="sm"
                variant="ghost"
                onPress={() => selectionRef.current[settledTab]?.onTrailingPress?.()}
              />
            ) : null}
          </>
        ) : (
          <>
            <AppText variant="title2" weight="700" style={styles.headerTitle}>Inventario</AppText>
            <View style={styles.headerActions} ref={overflowButtonRef} collapsable={false}>
              <IconButton
                icon="add"
                variant="plain"
                onPress={handleAdd}
                disabled={transitioning}
                accessibilityLabel={addAccessibilityLabel}
              />
              <IconButton
                icon="ellipsis-horizontal"
                variant="plain"
                onPress={handleOverflow}
                disabled={transitioning}
                accessibilityLabel="Más opciones"
              />
            </View>
          </>
        )}
      </View>
      <View style={styles.selector}>
        <SegmentedControl<InventoryWorkspaceTab>
          options={TAB_OPTIONS}
          value={targetTab}
          onChange={handleSelect}
          interactiveProgress={transitioning ? progress * (TAB_OPTIONS.length - 1) : undefined}
          accessibilityLabel="Sección de Inventario"
          testID="inventory-workspace-selector"
        />
      </View>
      <HorizontalPager
        index={TAB_INDEX[targetTab]}
        onIndexChange={(index) => handleSelect(tabFromIndex(index))}
        onSettled={(index) => {
          setSettledTab(tabFromIndex(index));
          setTransitioning(false);
        }}
        onProgress={(value) => setProgress(value)}
        onTransitionChange={setTransitioning}
        testID="inventory-workspace-pager"
      >
        {pages}
      </HorizontalPager>
      <AdaptiveActionMenu
        visible={overflowOpen}
        title="Inventario"
        anchor={anchor}
        itemCount={overflowActions.length}
        width={224}
        openDurationMs={130}
        closeDurationMs={100}
        initialScale={0.96}
        initialTranslateY={-3}
        popoverRadius={14}
        transparentBackdrop
        onRequestClose={() => setOverflowOpen(false)}
      >
        {overflowActions.map((action) => (
          <AdaptiveMenuRow
            key={action.id}
            title={action.label}
            variant={action.destructive ? 'danger' : undefined}
            onPress={() => {
              setOverflowOpen(false);
              action.onPress();
            }}
          />
        ))}
      </AdaptiveActionMenu>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background.base },
  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
  },
  headerTitle: { flex: 1, textAlign: 'left' },
  selectionTitle: { flex: 1, textAlign: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  selector: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
});
