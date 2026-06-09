import { supabase, isSupabaseConfigured } from './supabase';

export function todayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchDailyCareSignoffs({ careDate = todayDateString(), shift = 'AM' } = {}) {
  if (!isSupabaseConfigured) return { cleaning: [], medication: [] };

  const [
    { data: cleaning, error: cleaningError },
    { data: medication, error: medicationError }
  ] = await Promise.all([
    supabase.from('cleaning_signoffs').select('*').eq('care_date', careDate).eq('shift', shift),
    supabase.from('medication_signoffs').select('*').eq('care_date', careDate).eq('shift', shift)
  ]);

  if (cleaningError) throw cleaningError;
  if (medicationError) throw medicationError;

  return { cleaning: cleaning || [], medication: medication || [] };
}

export async function signOffCleaning({ animalId, shift, careDate = todayDateString(), signedBy, notes = '' }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const { data, error } = await supabase
    .from('cleaning_signoffs')
    .upsert({
      animal_id: animalId,
      shift,
      care_date: careDate,
      signed_by: signedBy || 'Unknown',
      notes
    }, { onConflict: 'animal_id,shift,care_date' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeCleaningSignoff({ animalId, shift, careDate = todayDateString() }) {
  const { error } = await supabase
    .from('cleaning_signoffs')
    .delete()
    .eq('animal_id', animalId)
    .eq('shift', shift)
    .eq('care_date', careDate);

  if (error) throw error;
}

export async function signOffMedication({ animalId, medicationId, shift, careDate = todayDateString(), givenBy, notes = '' }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const { data, error } = await supabase
    .from('medication_signoffs')
    .upsert({
      animal_id: animalId,
      medication_id: medicationId,
      shift,
      care_date: careDate,
      given_by: givenBy || 'Unknown',
      notes
    }, { onConflict: 'animal_id,medication_id,shift,care_date' })
    .select()
    .single();

  if (error) throw error;

  await supabase.from('med_logs').insert({
    animal_id: animalId,
    medication_id: medicationId,
    given_by: givenBy || 'Unknown',
    notes: notes || `${shift} medication sign-off`,
    given_at: new Date().toISOString()
  }).then(() => null);

  return data;
}

export async function removeMedicationSignoff({ animalId, medicationId, shift, careDate = todayDateString() }) {
  const { error } = await supabase
    .from('medication_signoffs')
    .delete()
    .eq('animal_id', animalId)
    .eq('medication_id', medicationId)
    .eq('shift', shift)
    .eq('care_date', careDate);

  if (error) throw error;
}
