import { supabase, isSupabaseConfigured } from './supabase';
import { todayDateString } from './careTaskRules';

export async function fetchCleaningSignoffsForDate(careDate = todayDateString()) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('cleaning_signoffs')
    .select('*')
    .eq('care_date', careDate);

  if (error) throw error;
  return data || [];
}
