import { supabase, isSupabaseConfigured } from './supabase';

export async function fetchMedicationsForAnimal(animalId) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('animal_id', animalId)
    .order('active', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createMedication(animalId, form) {
  const { data, error } = await supabase
    .from('medications')
    .insert({
      animal_id: animalId,
      medication_name: form.medication_name,
      dosage_notes: form.dosage_notes || '',
      schedule: form.schedule || 'AM',
      next_due: form.next_due || '',
      active: true,
      start_date: form.start_date || new Date().toISOString().slice(0, 10),
      end_date: form.end_date || null,
      notes: form.notes || ''
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMedication(medicationId, form) {
  const { data, error } = await supabase
    .from('medications')
    .update({
      medication_name: form.medication_name,
      dosage_notes: form.dosage_notes || '',
      schedule: form.schedule || 'AM',
      next_due: form.next_due || '',
      active: form.active !== false,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      notes: form.notes || ''
    })
    .eq('id', medicationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function stopMedication(medicationId, reason = '') {
  const { error } = await supabase
    .from('medications')
    .update({
      active: false,
      stopped_at: new Date().toISOString(),
      stopped_reason: reason || 'Stopped'
    })
    .eq('id', medicationId);
  if (error) throw error;
}

export async function deleteMedication(medicationId) {
  const { error } = await supabase
    .from('medications')
    .delete()
    .eq('id', medicationId);
  if (error) throw error;
}

export async function giveMedication({ medicationId, animalId, givenBy, notes }) {
  const { data, error } = await supabase
    .from('med_logs')
    .insert({
      medication_id: medicationId,
      animal_id: animalId,
      given_by: givenBy || 'Unknown',
      notes: notes || '',
      given_at: new Date().toISOString()
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMedLogsForAnimal(animalId) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('med_logs')
    .select(`*, medications (medication_name, dosage_notes, schedule)`)
    .eq('animal_id', animalId)
    .order('given_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}
