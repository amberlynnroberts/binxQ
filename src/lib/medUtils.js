import { supabase } from './supabase';

export function medNeededForShift(med, shift) {
  const schedule = String(med.schedule || '').toLowerCase();

  // Don't show if start_date is in the future
  if (med.startDate) {
    const start = new Date(med.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    if (start > today) return false;
  }

  // Don't show if end_date has passed
  if (med.endDate) {
    const end = new Date(med.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (end < today) return false;
  }

  if (shift === 'AM') {
    return schedule.includes('am') || schedule.includes('morning') ||
           schedule.includes('daily') || schedule.includes('every 12') ||
           schedule.includes('every 8');
  }

  return schedule.includes('pm') || schedule.includes('evening') ||
         schedule.includes('night') || schedule.includes('every 12') ||
         schedule.includes('every 8');
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

export async function deleteMedication(medicationId) {
  const { error } = await supabase
    .from('medications')
    .delete()
    .eq('id', medicationId);
  if (error) throw error;
}