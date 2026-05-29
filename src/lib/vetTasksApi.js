import { supabase, isSupabaseConfigured } from './supabase';

export function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateString, days) {
  const d = new Date(`${dateString}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function fetchVetTasks({ includeCompleted = false } = {}) {
  if (!isSupabaseConfigured) return [];

  let query = supabase.from('vet_tasks').select('*').order('due_date', { ascending: true });
  if (!includeCompleted) query = query.eq('completed', false);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchUpcomingVetTasks() {
  if (!isSupabaseConfigured) return [];

  const today = todayDateString();
  const sevenDays = addDays(today, 7);

  const { data, error } = await supabase
    .from('vet_tasks')
    .select('*')
    .eq('completed', false)
    .gte('due_date', today)
    .lte('due_date', sevenDays)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addVetTask({ animalId, taskType = 'Vaccine', taskName, dueDate, notes = '' }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  if (!animalId) throw new Error('Animal is required');
  if (!taskName?.trim()) throw new Error('Task name is required');
  if (!dueDate) throw new Error('Due date is required');

  const { data, error } = await supabase
    .from('vet_tasks')
    .insert({
      animal_id: animalId,
      task_type: taskType,
      task_name: taskName.trim(),
      due_date: dueDate,
      notes
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeVetTask({ taskId, completedBy = 'Unknown' }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const { data, error } = await supabase
    .from('vet_tasks')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      completed_by: completedBy || 'Unknown'
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVetTask(taskId) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { error } = await supabase.from('vet_tasks').delete().eq('id', taskId);
  if (error) throw error;
}
