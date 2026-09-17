import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AppText } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { openEntityDetail } from '../../navigation/plannerNavigationHelpers';
import {
  planPlannerSearchBack,
  type PlannerSearchEntrySource,
} from '../../navigation/plannerSearchNavigation';
import {
  classifyPlannerSearchError,
  fetchPlannerActiveSearch,
  hasVisiblePlannerSearchResults,
  normalizePlannerSearchInput,
  shouldRunPlannerSearch,
  type PlannerSearchGroup,
  type PlannerSearchResponse,
  type PlannerSearchResult,
  type PlannerSearchStatus,
} from '../../services/planner/plannerActiveSearch';
import { plannerSearchTelemetry } from '../../services/planner/plannerSearchTelemetry';

const SEARCH_TIMEOUT_MS = 8000;
const SEARCH_DEBOUNCE_MS = 220;

function readableSource(value: unknown): PlannerSearchEntrySource {
  if (value === 'quick_action' || value === 'planner') return value;
  return 'unknown';
}

function resultIcon(entityType: PlannerSearchResult['entityType']) {
  if (entityType === 'task') return 'checkbox-outline';
  if (entityType === 'event') return 'calendar-outline';
  return 'flag-outline';
}

function statusCopy(status: PlannerSearchStatus, query: string) {
  switch (status.kind) {
    case 'initial':
      return 'Buscá tareas, eventos o planes activos.';
    case 'loading':
      return status.stale ? 'Actualizando resultados...' : 'Buscando...';
    case 'empty':
      return `No encontramos resultados activos para "${query}".`;
    case 'offline':
      return 'Sin conexión. Mostramos lo último disponible cuando existe.';
    case 'forbidden':
    case 'session_invalid':
    case 'error':
      return status.message;
    case 'results':
      return `${status.response.total} resultados activos.`;
    default:
      return '';
  }
}

export function PlannerSearchScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const inputRef = useRef<TextInput | null>(null);
  const requestSeq = useRef(0);
  const telemetryEmitted = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;
  const source = readableSource(route.params?.source);
  const returnTo: string | undefined = route.params?.returnTo;

  const [query, setQuery] = useState('');
  const [lastResponse, setLastResponse] = useState<PlannerSearchResponse | null>(null);
  const [status, setStatus] = useState<PlannerSearchStatus>({ kind: 'initial' });
  const [retryNonce, setRetryNonce] = useState(0);

  const normalizedQuery = useMemo(() => normalizePlannerSearchInput(query), [query]);
  const contextScope = householdId ? `planner-search:${householdId}` : 'planner-search:no-household';
  const visibleGroups = useMemo(
    () => (lastResponse?.groups ?? []).filter((group) => group.results.length > 0),
    [lastResponse],
  );

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (telemetryEmitted.current) return;
    telemetryEmitted.current = true;
    plannerSearchTelemetry.opened({
      source,
      entry_type: 'screen',
    });
  }, [source]);

  useEffect(() => {
    abortRef.current?.abort();
    requestSeq.current += 1;
    setQuery('');
    setLastResponse(null);
    setStatus({ kind: 'initial' });
  }, [householdId, accessToken]);

  useEffect(() => {
    abortRef.current?.abort();

    if (!accessToken || !householdId) {
      setLastResponse(null);
      setStatus({ kind: 'session_invalid', message: 'Tu sesión ya no está activa.' });
      return;
    }

    if (!shouldRunPlannerSearch(normalizedQuery)) {
      setLastResponse(null);
      setStatus({ kind: 'initial' });
      return;
    }

    const sequence = ++requestSeq.current;
    const controller = new AbortController();
    abortRef.current = controller;
    const staleResponse = lastResponse;
    const timer = setTimeout(() => {
      setStatus({ kind: 'loading', stale: staleResponse !== null });
      void fetchPlannerActiveSearch({
        accessToken,
        query: normalizedQuery,
        limit: 30,
        signal: controller.signal,
        timeoutMs: SEARCH_TIMEOUT_MS,
        contextScope,
      })
        .then((response) => {
          if (sequence !== requestSeq.current || controller.signal.aborted) return;
          setLastResponse(response);
          setStatus(hasVisiblePlannerSearchResults(response)
            ? { kind: 'results', response, stale: false }
            : { kind: 'empty', query: normalizedQuery });
        })
        .catch((error) => {
          if (sequence !== requestSeq.current) return;
          const next = classifyPlannerSearchError(error, staleResponse);
          if (next.kind === 'loading') return;
          setStatus(next);
          if (next.kind !== 'offline') setLastResponse(null);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [accessToken, contextScope, householdId, normalizedQuery, retryNonce]);

  const handleBack = useCallback(() => {
    Keyboard.dismiss();
    abortRef.current?.abort();
    planPlannerSearchBack(navigation, { source, returnTo });
  }, [navigation, returnTo, source]);

  const handleRetry = useCallback(() => {
    setRetryNonce((value) => value + 1);
  }, []);

  const handleOpenResult = useCallback((result: PlannerSearchResult) => {
    Keyboard.dismiss();
    openEntityDetail(navigation, result.entityType, {
      entityId: result.entityId,
      source: 'quick_action',
      returnTo: 'previous',
    });
  }, [navigation]);

  const hasStaleVisible = status.kind === 'offline' && status.staleResponse !== null;
  const showGroups = visibleGroups.length > 0 && (status.kind === 'results' || status.kind === 'loading' || hasStaleVisible);
  const liveCopy = statusCopy(status, normalizedQuery);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
        >
          <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
        </Pressable>
        <View style={styles.searchInputBox}>
          <HomePlusIcon name="search-outline" size={18} color={colors.text.secondary} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar en HomePlus..."
            placeholderTextColor={colors.text.tertiary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
            accessibilityLabel="Buscar en HomePlus"
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              hitSlop={8}
              style={styles.clearButton}
            >
              <HomePlusIcon name="close-circle" size={18} color={colors.text.tertiary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.statusLine} accessibilityLiveRegion="polite">
        {status.kind === 'loading' ? <ActivityIndicator size="small" color={colors.terracotta[600]} /> : null}
        <AppText variant="bodySmall" tone={status.kind === 'error' || status.kind === 'offline' ? 'warning' : 'secondary'}>
          {liveCopy}
        </AppText>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        keyboardShouldPersistTaps="handled"
      >
        {showGroups ? (
          visibleGroups.map((group) => (
            <SearchGroup key={group.entityType} group={group} onOpen={handleOpenResult} />
          ))
        ) : status.kind === 'error' || status.kind === 'offline' || status.kind === 'forbidden' || status.kind === 'session_invalid' ? (
          <View style={styles.stateBox}>
            <AppText variant="title3" weight="800" align="center">
              {status.kind === 'offline' ? 'Sin conexión' : 'Search no disponible'}
            </AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">
              {liveCopy}
            </AppText>
            {status.kind === 'error' || status.kind === 'offline' ? (
              <Pressable style={styles.retryButton} onPress={handleRetry} accessibilityRole="button" accessibilityLabel="Reintentar búsqueda">
                <AppText variant="bodySmall" weight="800" tone="inverse">Reintentar</AppText>
              </Pressable>
            ) : null}
          </View>
        ) : status.kind === 'empty' ? (
          <View style={styles.stateBox}>
            <AppText variant="title3" weight="800" align="center">Sin resultados</AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">{liveCopy}</AppText>
          </View>
        ) : status.kind === 'initial' ? (
          <View style={styles.stateBox}>
            <AppText variant="title3" weight="800" align="center">Search</AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">{liveCopy}</AppText>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SearchGroup({ group, onOpen }: {
  readonly group: PlannerSearchGroup;
  readonly onOpen: (result: PlannerSearchResult) => void;
}) {
  return (
    <View style={styles.group} accessibilityLabel={`${group.label}: ${group.results.length} resultados`}>
      <AppText variant="bodySmall" weight="800" tone="secondary" style={styles.groupTitle}>
        {group.label}
      </AppText>
      {group.results.map((result) => (
        <Pressable
          key={result.id}
          onPress={() => onOpen(result)}
          style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
          accessibilityRole="button"
          accessibilityLabel={`${result.title}. ${result.subtitle}. Abrir detalle.`}
        >
          <View style={styles.resultIcon}>
            <HomePlusIcon name={resultIcon(result.entityType)} size={20} color={colors.terracotta[600]} />
          </View>
          <View style={styles.resultText}>
            <AppText variant="body" weight="800" numberOfLines={2}>
              {result.title}
            </AppText>
            <AppText variant="caption" tone="secondary" numberOfLines={2}>
              {result.subtitle}
            </AppText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
  },
  searchInputBox: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
  },
  input: {
    flex: 1,
    minHeight: 44,
    marginLeft: spacing[2],
    color: colors.text.primary,
    fontSize: 16,
  },
  clearButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLine: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[2],
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  group: {
    marginTop: spacing[4],
  },
  groupTitle: {
    marginBottom: spacing[2],
  },
  resultRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  resultRowPressed: {
    backgroundColor: colors.surface.soft,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.terracotta[50],
    marginRight: spacing[3],
  },
  resultText: {
    flex: 1,
  },
  stateBox: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6],
  },
  retryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    borderRadius: radius.md,
    backgroundColor: colors.terracotta[600],
  },
});
