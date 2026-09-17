import { supabase } from '../supabase';

export type Schedule = {
  id: string;
  household_id: string;
  user_id: string;
  title: string;
  start_time: string;  // "HH:MM"
  end_time: string | null;
  recurrence: 'daily' | 'weekly' | 'monthly' | 'none';
  recurrence_days: number[] | null;  // [1..7] Lun=1 Dom=7
  recurrence_day: number | null;
  color: string;
  category: 'trabajo' | 'escuela' | 'deporte' | 'salud' | 'familia' | 'personal' | 'otro';
  created_at: string;
  updated_at: string;
};

export type ScheduleInput = Omit<Schedule, 'id' | 'created_at' | 'updated_at'>;

export async function getHouseholdSchedules(
  householdId: string,
): Promise<{ schedules: Schedule[]; error: string | null }> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('household_id', householdId)
    .order('start_time', { ascending: true });

  if (error) {
    return { schedules: [], error: 'No pudimos cargar los horarios.' };
  }

  return { schedules: (data as Schedule[]) ?? [], error: null };
}

export async function upsertSchedule(
  schedule: ScheduleInput & { id?: string },
): Promise<{ schedule: Schedule | null; error: string | null }> {
  const { data, error } = await supabase
    .from('schedules')
    .upsert(schedule)
    .select()
    .single();

  if (error || !data) {
    return { schedule: null, error: 'No pudimos guardar el horario.' };
  }

  return { schedule: data as Schedule, error: null };
}

export async function deleteSchedule(
  scheduleId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);
  if (error) return { error: 'No pudimos eliminar el horario.' };
  return { error: null };
}
