import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppButton, AppInput, AppText, ErrorState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { getPlanByIdV1, updatePlanV1, type PlannerPlanV1 } from '../../services/plannerPlansV1Frontend';
import { spacing } from '../../constants/theme';
import { plannerStyles as S } from './plannerShared';

export function PlannerPlanEditScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session } = useAuth();
  const { markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;
  const planId = (route.params?.entityId ?? route.params?.planId ?? route.params?.goalId) as string;
  const [plan, setPlan] = useState<PlannerPlanV1 | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !planId) return;
    setLoading(true); setError(null);
    try {
      const response = await getPlanByIdV1(accessToken, planId);
      if (!response.plan.availableActions?.includes('edit')) throw new Error('Reabrí el plan antes de editarlo.');
      setPlan(response.plan); setTitle(response.plan.title); setDescription(response.plan.description ?? ''); setTargetDate(response.plan.targetDate ?? '');
    } catch (err) { setError(err instanceof Error ? err.message : 'No pudimos abrir el editor.'); }
    finally { setLoading(false); }
  }, [accessToken, planId]);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!accessToken || !plan || !title.trim()) return;
    setSaving(true); setError(null);
    try {
      await updatePlanV1(accessToken, plan.id, { title: title.trim(), description: description.trim() || null, targetDate: targetDate.trim() || null, expectedVersion: plan.version });
      markPlannerChanged(); navigation.goBack();
    } catch (err) { setError(err instanceof Error ? err.message : 'No pudimos guardar el plan.'); }
    finally { setSaving(false); }
  };

  if (loading) return <SafeAreaView style={S.safe}><ActivityIndicator /></SafeAreaView>;
  if (error && !plan) return <SafeAreaView style={S.safe}><ErrorState title="No pudimos editar el plan" description={error} retryLabel="Reintentar" onRetry={() => void load()} /></SafeAreaView>;
  return <SafeAreaView style={S.safe} edges={['top', 'bottom']}><View style={{ padding: spacing[5], gap: spacing[4] }}>
    <AppText variant="title1">Editar plan</AppText>
    {error ? <AppText variant="bodySmall" tone="danger">{error}</AppText> : null}
    <AppInput label="Nombre del plan" value={title} onChangeText={setTitle} />
    <AppInput label="Descripción opcional" value={description} onChangeText={setDescription} variant="multiline" />
    <AppInput label="Fecha objetivo (AAAA-MM-DD)" value={targetDate} onChangeText={setTargetDate} />
    <AppButton title="Guardar cambios" onPress={() => void save()} disabled={!title.trim() || saving} loading={saving} />
    <AppButton title="Cancelar" variant="ghost" onPress={() => navigation.goBack()} />
  </View></SafeAreaView>;
}
