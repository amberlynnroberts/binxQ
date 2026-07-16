import { supabase, isSupabaseConfigured } from './supabase';

export async function fetchEmployees() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addEmployee(name) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  if (!name?.trim()) throw new Error('Name is required');

  const { data, error } = await supabase
    .from('employees')
    .insert({ name: name.trim(), active: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Soft delete (active = false) rather than a hard delete, so historical
// sign-off records naming this employee still make sense even after
// they're removed from the active pill list.
export async function removeEmployee(id) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { error } = await supabase
    .from('employees')
    .update({ active: false })
    .eq('id', id);
  if (error) throw error;
}