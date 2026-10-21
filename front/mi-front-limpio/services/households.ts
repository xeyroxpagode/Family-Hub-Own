import {
  ApiError,
  createHousehold as createHouseholdRequest,
  setActiveHousehold as setActiveHouseholdRequest,
  type AuthMeHousehold,
} from './api';

// Tipos locales para HouseholdContext — mapeo de AuthMeHousehold
export type Household = {
  id: string;
  nombre: string;
  tipo: 'nucleo' | 'con_abuelos' | 'separados' | 'otro' | null;
  foto_url: string | null;
  created_by: string | null;
  created_at: string;
};

export type HouseholdMember = {
  id: string;
  user_id: string;
  household_id: string;
  rol: 'coordinador' | 'adulto' | 'adolescente' | 'adulto_mayor';
  joined_at: string;
  invited_by: string | null;
  user?: {
    nombre: string;
    email: string;
    avatar_url: string | null;
  };
};

export async function createHousehold(
  accessToken: string,
  name: string,
): Promise<{ household: AuthMeHousehold | null; error: string | null }> {
  try {
    const response = await createHouseholdRequest(accessToken, { name: name.trim() });
    if (response.me?.active_household?.id !== response.household.id) {
      await setActiveHouseholdRequest(accessToken, response.household.id);
    }
    return { household: response.household, error: null };
  } catch (error) {
    return {
      household: null,
      error: error instanceof ApiError
        ? error.message
        : 'No pudimos crear el hogar. Intenta nuevamente.',
    };
  }
}
