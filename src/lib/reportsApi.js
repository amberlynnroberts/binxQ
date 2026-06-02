import { supabase, isSupabaseConfigured } from './supabase';

export function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchDailyReport({ startDate, endDate }) {
  if (!isSupabaseConfigured) {
    return {
      cleaning: [],
      medication: [],
      quarantine: []
    };
  }

  const [
    { data: cleaning, error: cleaningError },
    { data: medication, error: medicationError },
    { data: quarantine, error: quarantineError }
  ] = await Promise.all([
    supabase
      .from('cleaning_signoffs')
      .select('*, animals(id, kennel_number, shelterluv_id, shelterluv_animals(name, status))')
      .gte('care_date', startDate)
      .lte('care_date', endDate)
      .order('care_date', { ascending: true })
      .order('shift', { ascending: true }),

    supabase
      .from('medication_signoffs')
      .select('*, animals(id, kennel_number, shelterluv_id, shelterluv_animals(name, status)), medications(medication_name, dosage_notes, schedule)')
      .gte('care_date', startDate)
      .lte('care_date', endDate)
      .order('care_date', { ascending: true })
      .order('shift', { ascending: true }),

    supabase
      .from('quarantine_checkoffs')
      .select('*, animals(id, kennel_number, shelterluv_id, shelterluv_animals(name, status))')
      .gte('care_date', startDate)
      .lte('care_date', endDate)
      .order('care_date', { ascending: true })
  ]);

  if (cleaningError) throw cleaningError;
  if (medicationError) throw medicationError;
  if (quarantineError) throw quarantineError;

  return {
    cleaning: cleaning || [],
    medication: medication || [],
    quarantine: quarantine || []
  };
}

export async function signOffQuarantinePaper({ careDate = todayDateString(), checkedBy, notes = '', shift = 'AM' }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const { data, error } = await supabase
    .from('quarantine_checkoffs')
    .upsert({
      care_date: careDate,
      check_type: `checklist_${shift}`,
      checked_by: checkedBy || 'Unknown',
      notes
    }, { onConflict: 'care_date,check_type' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function animalName(row) {
  return row?.animals?.shelterluv_animals?.name || 'Unknown';
}

export function animalKennel(row) {
  return row?.animals?.kennel_number || 'Unassigned';
}

export function downloadCsv(filename, rows) {
  const escape = value => {
    const text = String(value ?? '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
  };

  const csv = rows.map(row => row.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
