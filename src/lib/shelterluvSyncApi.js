import { supabase, isSupabaseConfigured } from './supabase';

export async function syncFromShelterluv() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await supabase.functions.invoke('sync-shelterluv', {
    method: 'POST',
    body: {}
  });

  if (error) throw error;
  if (data?.ok === false) throw new Error(data.error || 'Shelterluv sync failed');

  return data;
}

export async function fetchShelterluvSyncRuns() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('shelterluv_sync_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}
