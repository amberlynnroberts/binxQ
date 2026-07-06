import { supabase } from './supabase';

export function medNeededForShift(med, shift) {
  const schedule = String(med.schedule || '').toLowerCase();

  // FIXED: new Date("2026-07-06") parses date-only strings as UTC midnight,
  // not local midnight. In Eastern time that UTC instant falls on the
  // previous local calendar day, so .setHours(0,0,0,0) afterward locked in
  // a date shifted one day earlier than intended. A medication ending
  // "today" was being treated as already expired. Appending T00:00:00
  // forces the string to be parsed as local time instead, matching how
  // `today` itself is constructed below.
  if (med.startDate) {
    const start = new Date(`${med.startDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start > today) return false;
  }

  // Don't show if end_date has passed
  if (med.endDate) {
    const end = new Date(`${med.endDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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