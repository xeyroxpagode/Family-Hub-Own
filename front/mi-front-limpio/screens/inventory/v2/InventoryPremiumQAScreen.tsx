import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  AppButton,
  AppInput,
  AppScreen,
  AppText,
  BottomSheet,
  HorizontalPager,
  SegmentedControl,
} from '../../../components/ui';
import { getReducedMotionOverride, setReducedMotionOverride, useReducedMotion } from '../../../hooks/useReducedMotion';
import { colors, spacing } from '../../../constants/theme';

/**
 * DEV-ONLY QA harness for the Inventory Premium UX shared system.
 *
 * It is NOT production: the route is registered only under `__DEV__` and the
 * whole surface exists to prove the shared contracts PHYSICALLY on a device.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §12.
 */

const LOREM = [
  'Almacena', 'Azúcar', 'Arroz', 'Aceite', 'Café', 'Papel higiénico', 'Detergente',
  'Leche', 'Queso', 'Pan', 'Agua', 'Fideos', 'Tomate', 'Cebolla', 'Limón',
  'Harina', 'Sal', 'Atún', 'Yogur', 'Mantequilla',
];

export function InventoryPremiumQAScreen() {
  const navigation = useNavigation<any>();
  const reducedMotion = useReducedMotion();
  const [tab, setTab] = useState<'products' | 'shopping'>('products');
  const [productsScroll, setProductsScroll] = useState(0);
  const [shoppingScroll, setShoppingScroll] = useState(0);
  const [productsQuery, setProductsQuery] = useState('');
  const [sheet, setSheet] = useState<'compact' | 'standard' | 'flow' | null>(null);
  const [dirty, setDirty] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [guardRaised, setGuardRaised] = useState(0);
  const [detent, setDetent] = useState(0);
  const [reduceOverride, setReduceOverride] = useState<boolean | null>(getReducedMotionOverride());

  const pages = useMemo(
    () => [
      <DummyPage
        key="products"
        title="Productos (dummy)"
        onScroll={setProductsScroll}
        scrollOffset={productsScroll}
        query={productsQuery}
        onQueryChange={setProductsQuery}
      />,
      <DummyPage
        key="shopping"
        title="Compras (dummy)"
        onScroll={setShoppingScroll}
        scrollOffset={shoppingScroll}
      />,
    ],
    [productsQuery, productsScroll, shoppingScroll],
  );

  return (
    <AppScreen scroll bottomInset="none" contentContainerStyle={styles.screen}>
      <View style={styles.headerRow}>
        <AppButton title="Volver" size="sm" variant="ghost" onPress={() => navigation.goBack()} />
        <AppText variant="title3" weight="800" style={{ flex: 1 }}>QA Premium UX (dev)</AppText>
      </View>

      <AppText variant="caption" tone="secondary">
        Reduced Motion: {reducedMotion ? 'activo' : 'inactivo'} · override: {reduceOverride === null ? 'sistema' : reduceOverride ? 'forzado' : 'off'}
      </AppText>
      <View style={styles.row}>
        <AppButton title="Force reduced ON" size="sm" variant="secondary" onPress={() => { setReducedMotionOverride(true); setReduceOverride(true); }} />
        <AppButton title="Force reduced OFF" size="sm" variant="secondary" onPress={() => { setReducedMotionOverride(false); setReduceOverride(false); }} />
        <AppButton title="Use system" size="sm" variant="ghost" onPress={() => { setReducedMotionOverride(null); setReduceOverride(null); }} />
      </View>

      <AppText variant="title3" weight="700">A. Pager</AppText>
      <AppText variant="caption" tone="secondary">
        Products scroll {productsScroll} · Shopping scroll {shoppingScroll} · Products query “{productsQuery}”
      </AppText>
      <SegmentedControl
        options={[{ value: 'products', label: 'Productos' }, { value: 'shopping', label: 'Compras' }]}
        value={tab}
        onChange={setTab}
        accessibilityLabel="QA pager"
      />
      <View style={styles.pagerFrame}>
        <HorizontalPager index={tab === 'products' ? 0 : 1} onIndexChange={(index) => setTab(index === 1 ? 'shopping' : 'products')}>
          {pages}
        </HorizontalPager>
      </View>

      <AppText variant="title3" weight="700">B. Sheets</AppText>
      <View style={styles.row}>
        <AppButton title="Compact" size="sm" variant="secondary" onPress={() => setSheet('compact')} />
        <AppButton title="Standard" size="sm" variant="secondary" onPress={() => setSheet('standard')} />
        <AppButton title="Flow" size="sm" variant="secondary" onPress={() => setSheet('flow')} />
      </View>
      <View style={styles.row}>
        <AppButton title={dirty ? 'Dirty: ON' : 'Dirty: OFF'} size="sm" variant="ghost" onPress={() => setDirty((current) => !current)} />
        <AppButton title={committing ? 'Committing: ON' : 'Committing: OFF'} size="sm" variant="ghost" onPress={() => setCommitting((current) => !current)} />
      </View>
      <AppText variant="caption" tone="secondary">Detent actual: {detent} · guard invocado {guardRaised} veces</AppText>

      <BottomSheet
        visible={sheet !== null}
        title={`Sheet ${sheet ?? ''}`}
        variant={sheet ?? 'standard'}
        dirty={dirty}
        committing={committing}
        onDetentChange={setDetent}
        onRequestDismissGuard={() => setGuardRaised((current) => current + 1)}
        onRequestClose={() => setSheet(null)}
        footer={<AppButton title="Cerrar" onPress={() => setSheet(null)} disabled={committing} />}
      >
        <AppText variant="bodySmall" tone="secondary">
          Arrastrá el grabber: el grabber siempre controla el sheet.
        </AppText>
        <AppText variant="bodySmall" tone="secondary">
          {dirty ? 'Dirty: el dismiss rebota y dispara el guard.' : 'Clean: el dismiss cierra.'}
          {committing ? ' Committing: drag, backdrop y back deshabilitados.' : ''}
        </AppText>
      </BottomSheet>

      <AppText variant="title3" weight="700">C. Scroll handoff</AppText>
      <AppText variant="caption" tone="secondary">Abrí el sheet Flow: la lista larga scrollea; al llegar al top, el gesto hacia abajo pasa al sheet.</AppText>
      <AppButton title="Flow con lista larga" size="sm" variant="secondary" onPress={() => setSheet('flow')} />

      <AppText variant="title3" weight="700">D. Keyboard</AppText>
      <AppText variant="caption" tone="secondary">
        El teclado no mueve el sheet: el ancla superior queda fija y el footer queda arriba del teclado.
      </AppText>
      <AppButton title="Standard con teclado" size="sm" variant="secondary" onPress={() => setSheet('standard')} />

      <KeyboardSheet />

      <AppText variant="title3" weight="700">Notas</AppText>
      <AppText variant="caption" tone="secondary">
        Esta pantalla es DEV-ONLY. La ruta InventoryPremiumQA sólo se registra bajo __DEV__.
      </AppText>
    </AppScreen>
  );
}

function KeyboardSheet() {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  return (
    <>
      <AppButton title="Sheet con inputs" size="sm" variant="secondary" onPress={() => setVisible(true)} />
      <BottomSheet
        visible={visible}
        title="Inputs del sheet"
        variant="standard"
        onRequestClose={() => setVisible(false)}
        footer={<AppButton title="Listo" onPress={() => setVisible(false)} />}
      >
        <AppText variant="caption" tone="secondary">El ancla superior del sheet no se mueve con el teclado.</AppText>
        <AppInput label="Texto" value={text} onChangeText={setText} placeholder="Escribí" />
        <AppInput label="Número" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
      </BottomSheet>
    </>
  );
}

function DummyPage({
  title,
  onScroll,
  scrollOffset,
  query,
  onQueryChange,
}: {
  title: string;
  onScroll: (offset: number) => void;
  scrollOffset: number;
  query?: string;
  onQueryChange?: (value: string) => void;
}) {
  return (
    <View style={styles.page}>
      <AppText variant="title3" weight="700">{title}</AppText>
      {onQueryChange ? (
        <AppInput label="Búsqueda" value={query ?? ''} onChangeText={onQueryChange} placeholder="Buscar" />
      ) : null}
      <AppText variant="caption" tone="secondary">scroll: {scrollOffset}</AppText>
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.pageScrollContent}
        onScroll={(event) => onScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {LOREM.map((item, index) => (
          <View key={`${item}-${index}`} style={styles.pageRow}>
            <AppText variant="bodySmall">{item}</AppText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing[4], gap: spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  row: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
  pagerFrame: { height: 320, borderWidth: 1, borderColor: colors.border.subtle, borderRadius: 12, overflow: 'hidden' },
  page: { flex: 1, padding: spacing[3], gap: spacing[2] },
  pageScroll: { flex: 1 },
  pageScrollContent: { gap: spacing[2], paddingBottom: spacing[6] },
  pageRow: { minHeight: 44, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
});
