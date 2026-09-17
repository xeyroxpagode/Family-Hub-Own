import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Household, HouseholdMember } from '../services/households';
import type { AuthMeHousehold, AuthMeMembership } from '../services/api';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';

type HouseholdContextType = {
  currentHousehold: Household | null;
  currentRole: HouseholdMember['rol'] | null;
  members: HouseholdMember[];
  isCoordinator: boolean;
  loading: boolean;
  reloading: boolean;
  householdError: string | null;
  reload: () => Promise<void>;
  refreshMembers: () => Promise<void>;
};

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

const mapRole = (role: AuthMeMembership['role']): HouseholdMember['rol'] | null => {
  if (role === 'coordinator') return 'coordinador';
  if (role === 'adult') return 'adulto';
  if (role === 'adolescent') return 'adolescente';
  if (role === 'child') return 'adolescente';
  if (role === 'senior') return 'adulto_mayor';
  if (role === 'guest') return 'adulto';
  return null;
};

const mapHousehold = (household: AuthMeHousehold): Household => ({
  id: household.id,
  nombre: household.name,
  tipo: null,
  foto_url: null,
  created_by: household.created_by_person_id,
  created_at: household.created_at,
});

type PublicHouseholdPerson = {
  person_id: string;
  household_id: string;
  membership_id: string;
  display_name: string;
  avatar_url: string | null;
  role: AuthMeMembership['role'];
  status: AuthMeMembership['status'];
  joined_at: string | null;
};

export const HouseholdProvider = ({ children }: { children: React.ReactNode }) => {
  const { authMe, authMeLoading, authMeError, refetchMe, user } = useAuth();
  const [reloading, setReloading] = useState(false);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);

  const activeMembership = useMemo(() => {
    const activeHouseholdId = authMe?.active_household?.id;
    const memberships = authMe?.memberships ?? [];

    if (activeHouseholdId) {
      return memberships.find(
        (membership) => membership.household_id === activeHouseholdId && membership.status === 'active',
      ) ?? null;
    }

    return memberships.find((membership) => membership.status === 'active') ?? null;
  }, [authMe?.active_household?.id, authMe?.memberships]);

  const currentHousehold = useMemo(
    () => authMe?.active_household ? mapHousehold(authMe.active_household) : null,
    [authMe?.active_household],
  );

  const currentRole = useMemo(() => mapRole(activeMembership?.role ?? null), [activeMembership?.role]);

  const fallbackMembers = useMemo<HouseholdMember[]>(() => {
    if (!currentHousehold || !activeMembership) return [];

    const displayName = authMe?.person?.display_name ?? user?.email ?? 'Usuario';

    return [{
      id: activeMembership.id,
      user_id: authMe?.person?.id ?? activeMembership.person_id,
      household_id: currentHousehold.id,
      rol: currentRole ?? 'adulto',
      joined_at: activeMembership.joined_at ?? activeMembership.created_at,
      invited_by: null,
      user: {
        nombre: displayName,
        email: user?.email ?? '',
        avatar_url: authMe?.person?.avatar_url ?? null,
      },
    }];
  }, [activeMembership, authMe?.person, currentHousehold, currentRole, user]);

const loadMembers = useCallback(async () => {
    if (!currentHousehold) {
      setMembers([]);
      setMembersError(null);
      return;
    }

    const { data, error } = await supabase
      .from('household_people_public')
      .select('person_id, household_id, membership_id, display_name, avatar_url, role, status, joined_at')
      .eq('household_id', currentHousehold.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: true });

    if (error) {
      setMembers(fallbackMembers);
      setMembersError('No pudimos cargar los miembros del hogar.');
      return;
    }

    const mappedMembers = ((data ?? []) as PublicHouseholdPerson[])
      .map((member) => ({
        id: member.membership_id,
        user_id: member.person_id,
        household_id: member.household_id,
        rol: mapRole(member.role) ?? 'adulto',
        joined_at: member.joined_at ?? new Date().toISOString(),
        invited_by: null,
        user: {
          nombre: member.display_name,
          email: '',
          avatar_url: member.avatar_url,
        },
      }));

    setMembers(mappedMembers.length > 0 ? mappedMembers : fallbackMembers);
    setMembersError(null);
  }, [currentHousehold, fallbackMembers]);

useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const reload = useCallback(async () => {
    setReloading(true);
    await refetchMe();
    await loadMembers();
    setReloading(false);
  }, [loadMembers, refetchMe]);

  const refreshMembers = useCallback(async () => {
    await loadMembers();
  }, [loadMembers]);

  const value = useMemo<HouseholdContextType>(
    () => ({
      currentHousehold,
      currentRole,
      members,
      isCoordinator: activeMembership?.role === 'coordinator',
      loading: authMeLoading,
      reloading,
      householdError: authMeError ?? membersError,
      reload,
      refreshMembers,
    }),
    [
      activeMembership?.role,
      authMeError,
      authMeLoading,
      currentHousehold,
      currentRole,
      members,
      membersError,
      reload,
      reloading,
      refreshMembers,
    ],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
};

export const useHousehold = () => {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold debe usarse dentro de HouseholdProvider.');
  return ctx;
};
