import { supabase, isSupabaseConfigured } from './supabase';

export async function syncShelterluvLive(options = {}) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const { data, error } = await supabase.functions.invoke('shelterluv-live-sync', {
    method: 'POST',
    body: {
      mode: options.mode || 'in_custody',
      since: options.since || '1672531199',
      limit: options.limit || 100,
      offset: options.offset || 0,
      status: options.status,
      status_type: options.status_type
    }
  });

  if (error) throw error;
  if (data?.ok === false) throw new Error(data.error || 'Shelterluv sync failed');
  return data;
}

export function syncShelterluvInCustody() {
  return syncShelterluvLive({ mode: 'in_custody' });
}

export function syncShelterluvQuarantine() {
  return syncShelterluvLive({ mode: 'quarantine' });
}

export function syncShelterluvArchived() {
  return syncShelterluvLive({ mode: 'archived' });
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
