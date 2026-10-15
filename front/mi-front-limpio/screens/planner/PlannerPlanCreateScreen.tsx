import React, { useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ApiError } from '../../services/api';
import { createPlanV1, type CreatePlanInput } from '../../services/plannerPlansV1Frontend';
import { createIdempotencyKey } from '../../services/idempotency';
import { useAuth } from '../../context/AuthContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { AppButton, AppInput, AppText } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import { plannerStyles as S } from './plannerShared';

type Props = {
  mode?: 'create';
  embedded?: boolean;
  onClose?: () => void;
  onSaved?: (message: string) => void;
  createMutationId?: string;
  onSubmitBegin?: (intentId: string) => void;
  onSubmitEnd?: (intentId: string) => void;
};

function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return d.getFullYear() === Number(match[1]) && d.getMonth() === Number(match[2]) - 1 && d.getDate() === Number(match[3]);
}

export function PlannerPlanCreateScreen({
  embedded = false,
  onClose,
  onSaved,
  createMutationId,
  onSubmitBegin,
  onSubmitEnd,
}: Props) {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session, loading: authLoading } = useAuth();
  const { markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;
  const routeReturnTo = (route.params?.returnTo as string) || undefined;
  const routeInitialTab = (route.params?.initialTab as string) || undefined;
  const insets = useSafeAreaInsets();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const planCreateKeyRef = useRef(createIdempotencyKey('planner.plans.v1.create'));

  const isFormReady = useMemo(() => {
    if (authLoading || saving) return false;
    if (!accessToken) return false;
    if (!title.trim()) return false;
    if (targetDate.trim() && !isValidDate(targetDate.trim())) return false;
    return true;
  }, [authLoading, saving, accessToken, title, targetDate]);

  const handleSubmit = async () => {
    if (!isFormReady || !accessToken) return;

    const payload: CreatePlanInput = {
      title: title.trim(),
      description: description.trim() || null,
      scope: 'household',
      targetDate: targetDate.trim() || null,
    };

    const intentId = createMutationId ?? planCreateKeyRef.current;
    if (onSubmitBegin) onSubmitBegin(intentId);

    setSaving(true);
    setError(null);

    try {
      const { plan } = await createPlanV1(accessToken, payload, {
        idempotencyKey: planCreateKeyRef.current,
        mutationId: createMutationId,
      });
      markPlannerChanged();
      planCreateKeyRef.current = createIdempotencyKey('planner.plans.v1.create');

      if (onSaved) {
        onSaved('Plan creado.');
      } else if (routeReturnTo === 'PlannerHome') {
        const tab = routeInitialTab ?? 'plans';
        navigation.replace('PlannerHome', { refreshKey: Date.now(), initialTab: tab });
      } else {
        navigation.navigate('PlanDetail', { planId: plan.id, justCreated: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos crear el plan.');
    } finally {
      setSaving(false);
      if (onSubmitEnd) onSubmitEnd(intentId);
    }
  };

  const closeForm = () => {
    if (onClose) {
      onClose();
      return;
    }

    if (routeReturnTo === 'PlannerHome') {
      const tab = routeInitialTab ?? 'plans';
      navigation.replace('PlannerHome', { refreshKey: Date.now(), initialTab: tab });
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('PlannerHome', { refreshKey: Date.now(), initialTab: 'plans' });
  };

  const handlePressOutside = () => {
    Keyboard.dismiss();
  };

  const content = (
    <Pressable style={styles.shell} onPress={handlePressOutside}>
      <KeyboardAwareScrollView
        style={embedded ? styles.embeddedScroll : S.scroll}
        contentContainerStyle={[styles.content, embedded && styles.embeddedContent]}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={76}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="title1">Nuevo plan</AppText>
            <AppText variant="bodySmall" tone="secondary" style={styles.headerSubtitle}>
              Título y alcance son obligatorios. El resto es opcional.
            </AppText>
          </View>
          {!embedded ? (
            <TouchableOpacity style={styles.closeButton} onPress={closeForm} accessibilityRole="button" accessibilityLabel="Cerrar formulario">
              <HomePlusIcon name="close" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {error ? (
          <View style={S.errorBox}>
            <AppText variant="bodySmall" tone="danger">{error}</AppText>
          </View>
        ) : null}

        <View style={styles.formStack}>
          <AppInput
            label="Nombre del plan"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (!titleTouched && text.length > 0) setTitleTouched(true);
            }}
            onBlur={() => {
              setTitleTouched(true);
            }}
            placeholder="Ej. Reforma del baño"
            returnKeyType="done"
            errorText={titleTouched && !title.trim() ? 'Agrega un nombre para el plan.' : undefined}
          />

          <AppInput
            label="Descripción opcional"
            value={description}
            onChangeText={setDescription}
            placeholder="Qué quieres lograr, por qué importa o cómo se ve logrado."
            variant="multiline"
          />

          <View style={styles.fieldGroup}>
            <AppText variant="caption" tone="tertiary">Visible para el hogar, según permisos de Planner.</AppText>
          </View>

          <AppInput
            label="Fecha objetivo (opcional)"
            value={targetDate}
            onChangeText={(value) => {
              setTargetDate(value);
              setError(null);
            }}
            placeholder="2026-12-31"
            keyboardType="default"
            errorText={targetDate.trim() && !isValidDate(targetDate.trim()) ? 'Usa formato AAAA-MM-DD.' : undefined}
            helperText='El plan se crea en estado "Preparación". Podrás activarlo cuando estés listo.'
          />
        </View>

        <View style={styles.actions}>
          <AppButton
            title="Crear plan"
            onPress={() => void handleSubmit()}
            disabled={!isFormReady || saving}
            loading={saving}
          />
          <AppButton title="Cancelar" variant="ghost" onPress={closeForm} />
        </View>

        <View style={{ height: 32 }} />
      </KeyboardAwareScrollView>
    </Pressable>
  );

  if (embedded) {
    return content;
  }

  return (
    <SafeAreaView style={S.safe} edges={['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  content: {
    padding: spacing[5],
    paddingBottom: 128,
  },
  embeddedContent: {
    paddingBottom: 112,
  },
  embeddedScroll: {
    flex: 1,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  headerSubtitle: {
    marginTop: spacing[1],
    lineHeight: 20,
  },
  closeButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  formStack: { gap: spacing[5] },
  fieldGroup: { gap: spacing[2] },
  actions: {
    marginTop: spacing[2],
    gap: spacing[2],
  },
});
