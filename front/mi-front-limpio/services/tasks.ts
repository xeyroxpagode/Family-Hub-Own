import { supabase } from '../supabase';

export type Task = {
  id: string;
  household_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  priority: 'alta' | 'media' | 'baja';
  status: 'pendiente' | 'en_progreso' | 'completada';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateTaskParams = {
  household_id: string;
  created_by: string;
  title: string;
  description?: string;
  priority?: Task['priority'];
  assigned_to?: string | null;
  due_date?: string | null;
};

export async function getHouseholdTasks(
  householdId: string,
  status?: Task['status'],
): Promise<{ tasks: Task[]; error: string | null }> {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return { tasks: [], error: 'No pudimos cargar las tareas del hogar.' };
  }

  return { tasks: (data as Task[]) ?? [], error: null };
}

export async function getMyTasks(
  householdId: string,
  userId: string,
): Promise<{ tasks: Task[]; error: string | null }> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('household_id', householdId)
    .neq('status', 'completada')
    .order('created_at', { ascending: false });

  if (error) {
    return { tasks: [], error: 'No pudimos cargar tus tareas.' };
  }

  const all = (data as Task[]) ?? [];
  const mine = all.filter(
    t => t.assigned_to === userId || (t.assigned_to === null && t.created_by === userId),
  );

  return { tasks: mine, error: null };
}

export async function createTask(
  params: CreateTaskParams,
): Promise<{ task: Task | null; error: string | null }> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      household_id: params.household_id,
      created_by: params.created_by,
      title: params.title.trim(),
      description: params.description ?? null,
      priority: params.priority ?? 'media',
      assigned_to: params.assigned_to ?? null,
      due_date: params.due_date ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    return { task: null, error: 'No pudimos crear la tarea.' };
  }

  return { task: data as Task, error: null };
}

export async function completeTask(
  taskId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'completada', completed_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) {
    return { error: 'No pudimos completar la tarea.' };
  }

  return { error: null };
}

export async function deleteTask(taskId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);

  if (error) {
    return { error: 'No pudimos eliminar la tarea.' };
  }

  return { error: null };
}
