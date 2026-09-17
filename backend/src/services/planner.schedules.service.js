const { createHttpError } = require('../lib/httpErrors');

const DAYS = new Set([0, 1, 2, 3, 4, 5, 6]);

const fail = (message) => {
  throw createHttpError(400, message, 'invalid_schedule');
};

const parseDays = (value) => {
  if (!Array.isArray(value)) fail('Selecciona al menos un dia.');
  const days = [...new Set(value.map(Number))].sort((a, b) => a - b);
  if (days.length === 0 || days.some((day) => !DAYS.has(day))) fail('Los dias seleccionados no son validos.');
  return days;
};

const parseTime = (value, label) => {
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 24 * 60) fail(`${label} no es valida.`);
  return minutes;
};

const parsePayload = (payload) => {
  const title = String(payload?.title ?? '').trim();
  if (!title) fail('Agrega un titulo para el horario.');
  if (title.length > 120) fail('El titulo es demasiado largo.');
  const startMinutes = parseTime(payload?.start_minutes, 'La hora de inicio');
  const endMinutes = parseTime(payload?.end_minutes, 'La hora de finalizacion');
  if (endMinutes <= startMinutes) fail('La hora de finalizacion debe ser posterior al inicio.');
  const note = String(payload?.note ?? '').trim();
  if (note.length > 280) fail('La nota es demasiado larga.');
  return {
    title,
    days_of_week: parseDays(payload?.days_of_week),
    start_minutes: startMinutes,
    end_minutes: endMinutes,
    note: note || null,
    color_key: ['terracotta', 'sage', 'blue', 'gold'].includes(payload?.color_key) ? payload.color_key : 'terracotta',
  };
};

async function assertHouseholdMember(context, personId) {
  const { data, error } = await context.client
    .from('household_people_public')
    .select('person_id')
    .eq('household_id', context.householdId)
    .eq('person_id', personId)
    .maybeSingle();
  if (error) throw createHttpError(500, error.message, 'internal_error');
  if (!data) throw createHttpError(404, 'Integrante no encontrado en este hogar.', 'schedule_member_not_found');
}

async function getPrivacy(context, personId) {
  const { data, error } = await context.client
    .from('household_schedule_preferences')
    .select('is_visible_to_household')
    .eq('household_id', context.householdId)
    .eq('person_id', personId)
    .maybeSingle();
  if (error) throw createHttpError(500, error.message, 'internal_error');
  return data?.is_visible_to_household ?? true;
}

async function canViewSchedule(context, personId) {
  const { data, error } = await context.client.rpc('can_view_household_schedule', {
    p_household_id: context.householdId,
    p_person_id: personId,
  });
  if (error) {
    const httpError = createHttpError(500, error.message, 'schedule_visibility_lookup_failed');
    httpError.details = error.details;
    httpError.hint = error.hint;
    throw httpError;
  }
  return data === true;
}

async function listSchedules(context, targetPersonId) {
  const personId = targetPersonId || context.personId;
  await assertHouseholdMember(context, personId);
  const isOwn = personId === context.personId;
  // The database function is the schedule visibility authority and is also
  // used by the schedule-block RLS policy. Reading the preferences table here
  // duplicated that decision and could fail before the canonical RLS check.
  const isVisible = isOwn || await canViewSchedule(context, personId);
  if (!isVisible) return { person_id: personId, can_view: false, schedules: [] };

  const { data, error } = await context.client
    .from('household_schedule_blocks')
    .select('*')
    .eq('household_id', context.householdId)
    .eq('person_id', personId)
    .order('start_minutes', { ascending: true });
  if (error) throw createHttpError(500, error.message, 'internal_error');
  return { person_id: personId, can_view: true, schedules: data ?? [] };
}

async function createSchedule(context, payload) {
  const values = parsePayload(payload);
  const { data, error } = await context.client
    .from('household_schedule_blocks')
    .insert({ ...values, household_id: context.householdId, person_id: context.personId })
    .select('*')
    .single();
  if (error) throw createHttpError(400, error.message, 'schedule_create_failed');
  return { schedule: data };
}

async function updateSchedule(context, scheduleId, payload) {
  const values = parsePayload(payload);
  const { data, error } = await context.client
    .from('household_schedule_blocks')
    .update(values)
    .eq('id', scheduleId)
    .eq('household_id', context.householdId)
    .eq('person_id', context.personId)
    .select('*')
    .maybeSingle();
  if (error) throw createHttpError(400, error.message, 'schedule_update_failed');
  if (!data) throw createHttpError(404, 'Horario no encontrado o sin permisos.', 'schedule_not_found');
  return { schedule: data };
}

async function deleteSchedule(context, scheduleId) {
  const { data, error } = await context.client
    .from('household_schedule_blocks')
    .delete()
    .eq('id', scheduleId)
    .eq('household_id', context.householdId)
    .eq('person_id', context.personId)
    .select('id')
    .maybeSingle();
  if (error) throw createHttpError(400, error.message, 'schedule_delete_failed');
  if (!data) throw createHttpError(404, 'Horario no encontrado o sin permisos.', 'schedule_not_found');
  return { deleted: true };
}

async function getMyPrivacy(context) {
  return { is_visible_to_household: await getPrivacy(context, context.personId) };
}

async function updateMyPrivacy(context, isVisible) {
  if (typeof isVisible !== 'boolean') fail('Indica la visibilidad de tus horarios.');
  const { data, error } = await context.client
    .from('household_schedule_preferences')
    .upsert(
      { household_id: context.householdId, person_id: context.personId, is_visible_to_household: isVisible },
      { onConflict: 'household_id,person_id' },
    )
    .select('is_visible_to_household')
    .single();
  if (error) throw createHttpError(400, error.message, 'schedule_privacy_update_failed');
  return data;
}

module.exports = {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getMyPrivacy,
  updateMyPrivacy,
};
