import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppRefresh } from '../../context/AppRefreshContext';
import { type HouseholdScheduleBlock, listHouseholdSchedules } from '../plannerSchedules';
import { fetchPlannerActivityRequest } from './plannerActivityClient';
import type { ActivityItem } from './plannerActivity';
import { fetchPlannerAttentionRequest } from './plannerAttentionClient';
import type { AttentionItem } from './plannerAttention';

export type HomeScheduleItem = HouseholdScheduleBlock & {
  readonly personId: string;
  readonly personName: string;
};

type DailySignalsState = {
  readonly loading: boolean;
  readonly attention: readonly AttentionItem[];
  readonly activity: readonly ActivityItem[];
  readonly schedules: readonly HomeScheduleItem[];
  readonly attentionError: string | null;
  readonly activityError: string | null;
  readonly schedulesError: string | null;
};

const INITIAL_STATE: DailySignalsState = {
  loading: true,
  attention: [],
  activity: [],
  schedules: [],
  attentionError: null,
  activityError: null,
  schedulesError: null,
};

type Person = { readonly id: string; readonly name: string };

/**
 * Small Home-only aggregator for projections that already have their own
 * authority. It deliberately does not derive tasks/events: those remain owned
 * by the Planner summary endpoint.
 */
export function useHomeDailySignals(params: {
  readonly accessToken: string | null;
  readonly householdId: string | null;
  readonly people: readonly Person[];
}) {
  const { plannerChangedAt } = useAppRefresh();
  const [state, setState] = useState<DailySignalsState>(INITIAL_STATE);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!params.accessToken || !params.householdId) {
      setState({ ...INITIAL_STATE, loading: false });
      return;
    }

    const currentRequest = ++requestId.current;
    setState((previous) => ({ ...previous, loading: true, attentionError: null, activityError: null, schedulesError: null }));
    const scope = `home-daily:${params.householdId}`;

    const [attentionResult, activityResult, schedulesResult] = await Promise.allSettled([
      fetchPlannerAttentionRequest({ accessToken: params.accessToken, limit: 3, contextScope: scope }),
      fetchPlannerActivityRequest({ accessToken: params.accessToken, limit: 3, contextScope: scope }),
      Promise.allSettled(params.people.map(async (person) => {
        const response = await listHouseholdSchedules(params.accessToken!, person.id);
        return response.can_view
          ? response.schedules.map((schedule) => ({ ...schedule, personId: person.id, personName: person.name }))
          : [];
      })),
    ]);

    if (currentRequest !== requestId.current) return;
    const message = (result: PromiseSettledResult<unknown>, fallback: string) =>
      result.status === 'rejected' && result.reason instanceof Error ? result.reason.message : fallback;

    setState({
      loading: false,
      attention: attentionResult.status === 'fulfilled' ? attentionResult.value.items : [],
      activity: activityResult.status === 'fulfilled' ? activityResult.value.groups.flatMap((group) => group.items).slice(0, 3) : [],
      schedules: schedulesResult.status === 'fulfilled'
        ? schedulesResult.value.flatMap((result) => result.status === 'fulfilled' ? result.value : []).sort((a, b) => a.start_minutes - b.start_minutes).slice(0, 3)
        : [],
      attentionError: attentionResult.status === 'rejected' ? message(attentionResult, 'No pudimos cargar la atención.') : null,
      activityError: activityResult.status === 'rejected' ? message(activityResult, 'No pudimos cargar la actividad.') : null,
      schedulesError: schedulesResult.status === 'rejected'
        ? message(schedulesResult, 'No pudimos cargar los horarios.')
        : schedulesResult.value.some((result) => result.status === 'rejected')
          ? 'No pudimos cargar todos los horarios. Podés reintentar.'
          : null,
    });
  }, [params.accessToken, params.householdId, params.people]);

  useEffect(() => {
    void refresh();
  }, [refresh, plannerChangedAt]);

  useEffect(() => () => { requestId.current += 1; }, []);

  return { ...state, refresh };
}
