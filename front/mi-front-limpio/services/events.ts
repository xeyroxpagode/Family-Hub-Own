import { supabase } from '../supabase';

export type CalendarEvent = {
  id: string;
  household_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  category: 'trabajo' | 'escuela' | 'familia' | 'personal' | 'salud' | 'deporte' | 'otro';
  color: string;
  all_day: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateEventParams = {
  household_id: string;
  created_by: string;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string | null;
  location?: string | null;
  category?: CalendarEvent['category'];
  color?: string;
  all_day?: boolean;
  assigned_to?: string | null;
};

export async function getHouseholdEvents(
  householdId: string,
  from?: string,
  to?: string,
): Promise<{ events: CalendarEvent[]; error: string | null }> {
  let query = supabase
    .from('events')
    .select('*')
    .eq('household_id', householdId)
    .order('start_at', { ascending: true });

  if (from) query = query.gte('start_at', from);
  if (to)   query = query.lte('start_at', to);

  const { data, error } = await query;

  if (error) {
    return { events: [], error: 'No pudimos cargar los eventos del hogar.' };
  }

  return { events: (data as CalendarEvent[]) ?? [], error: null };
}

export async function getTodayEvents(
  householdId: string,
): Promise<{ events: CalendarEvent[]; error: string | null }> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
  return getHouseholdEvents(householdId, startOfDay, endOfDay);
}

export async function getMyTodayEvents(
  householdId: string,
  userId: string,
): Promise<{ events: CalendarEvent[]; error: string | null }> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  const { events, error } = await getHouseholdEvents(householdId, startOfDay, endOfDay);
  if (error) return { events: [], error };

  const mine = events.filter(e => e.assigned_to === userId || e.assigned_to === null);
  return { events: mine, error: null };
}

export async function createEvent(
  params: CreateEventParams,
): Promise<{ event: CalendarEvent | null; error: string | null }> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      household_id: params.household_id,
      created_by: params.created_by,
      title: params.title.trim(),
      description: params.description ?? null,
      start_at: params.start_at,
      end_at: params.end_at ?? null,
      location: params.location ?? null,
      category: params.category ?? 'personal',
      color: params.color ?? '#E7643F',
      all_day: params.all_day ?? false,
      assigned_to: params.assigned_to ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    return { event: null, error: 'No pudimos crear el evento.' };
  }

  return { event: data as CalendarEvent, error: null };
}

export async function deleteEvent(eventId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('events').delete().eq('id', eventId);

  if (error) {
    return { error: 'No pudimos eliminar el evento.' };
  }

  return { error: null };
}
