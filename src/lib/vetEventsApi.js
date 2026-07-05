import { supabase, isSupabaseConfigured } from './supabase';

export const vetEventTypes = [
  'Vaccine',
  'Booster',
  'Rabies',
  'Spay/Neuter',
  'Vet Appointment',
  'Follow Up',
  'Surgery',
  'Lab Work',
  'Dental',
  'Other'
];

export function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateString, days) {
  const d = new Date(`${dateString}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function eventDateValue(event) {
  if (event.appointment_at) return event.appointment_at.slice(0, 10);
  return event.due_date;
}

export function isVetEventOverdue(event) {
  const date = eventDateValue(event);
  return !event.completed && date && date < todayDateString();
}

export function isVetEventDueSoon(event, days = 7) {
  const date = eventDateValue(event);
  if (!date || event.completed) return false;

  const today = todayDateString();
  const end = addDays(today, days);

  return date >= today && date <= end;
}

export function getVetEventStatus(event) {
  if (event.completed) return 'Completed';
  if (isVetEventOverdue(event)) return 'Overdue';
  if (isVetEventDueSoon(event, 7)) return 'Due Soon';
  return 'Upcoming';
}

export async function fetchVetEvents({ includeCompleted = false } = {}) {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('vet_events')
    .select('*')
    .order('due_date', { ascending: true })
    .order('appointment_at', { ascending: true });

  if (!includeCompleted) {
    query = query.eq('completed', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchUpcomingVetEvents({ days = 7 } = {}) {
  if (!isSupabaseConfigured) return [];

  const today = todayDateString();
  const end = addDays(today, days);

  const { data, error } = await supabase
    .from('vet_events')
    .select('*')
    .eq('completed', false)
    .or(`and(due_date.gte.${today},due_date.lte.${end}),and(appointment_at.gte.${today}T00:00:00,appointment_at.lte.${end}T23:59:59)`)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addVetEvent({
  animalId,
  eventType = 'Vaccine',
  eventName,
  dueDate = null,
  appointmentAt = null,
  location = '',
  veterinarian = '',
  notes = ''
}) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  if (!animalId) throw new Error('Animal is required');
  if (!eventName?.trim()) throw new Error('Event name is required');

  if (!dueDate && !appointmentAt) {
    throw new Error('Due date or appointment date/time is required');
  }

  const { data, error } = await supabase
    .from('vet_events')
    .insert({
      animal_id: animalId,
      event_type: eventType,
      event_name: eventName.trim(),
      due_date: dueDate || null,
      appointment_at: appointmentAt ? new Date(appointmentAt).toISOString() : null,      location: location || null,
      veterinarian: veterinarian || null,
      notes: notes || null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeVetEvent({ eventId, completedBy = 'Unknown' }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const { data, error } = await supabase
    .from('vet_events')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      completed_by: completedBy || 'Unknown'
    })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVetEvent(eventId) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const { error } = await supabase
    .from('vet_events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
}

export function summarizeVetEvents(events = []) {
  return {
    overdue: events.filter(isVetEventOverdue).length,
    dueSoon: events.filter(e => isVetEventDueSoon(e, 7)).length,
    total: events.filter(e => !e.completed).length
  };
}
