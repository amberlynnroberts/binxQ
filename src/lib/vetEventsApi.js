import { supabase, isSupabaseConfigured } from './supabase';

export const vetEventTypes = [
  'Vaccine',
  'Booster',
  'Rabies',
  'Flea/Tick Preventative',
  'Dewormer',
  'Spay/Neuter',
  'Vet Appointment',
  'Follow Up',
  'Surgery',
  'Lab Work',
  'Dental',
  'Other'
];

// Adds whole years/days to a plain "YYYY-MM-DD" date string, using explicit
// local-time parsing (T00:00:00) to avoid the UTC-vs-local off-by-one-day
// bug we already fixed elsewhere in this codebase (medUtils.js, vet
// appointment times). Returns a "YYYY-MM-DD" string.
export function addYearsToDateString(dateString, years) {
  if (!dateString) return null;
  const d = new Date(`${dateString}T00:00:00`);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export function addDaysToDateString(dateString, days) {
  if (!dateString) return null;
  const d = new Date(`${dateString}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Given a date-given string and either a Rabies vaccine_duration
// ('1 year' / '3 year') or a Flea/Tick flea_tick_interval
// ('30 days' / 'other'), returns the auto-calculated next-due date string,
// or null if it can't be auto-calculated (e.g. flea/tick 'other' — that
// case is always manual entry).
export function calculateNextDueDate({ dateGiven, eventType, vaccineDuration, fleaTickInterval }) {
  if (!dateGiven) return null;

  if (eventType === 'Rabies' && vaccineDuration) {
    if (vaccineDuration === '1 year') return addYearsToDateString(dateGiven, 1);
    if (vaccineDuration === '3 year') return addYearsToDateString(dateGiven, 3);
  }

  if (eventType === 'Flea/Tick Preventative' && fleaTickInterval === '30 days') {
    return addDaysToDateString(dateGiven, 30);
  }

  return null;
}

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

export async function fetchVetEventsForAnimal(animalId) {
  if (!isSupabaseConfigured) return [];
  if (!animalId) return [];

  // Unlike fetchVetEvents (which defaults to open items only, for the
  // dashboard/calendar), this pulls the FULL history for one animal —
  // completed and open both — for use in an adoption/medical record.
  const { data, error } = await supabase
    .from('vet_events')
    .select('*')
    .eq('animal_id', animalId)
    .order('due_date', { ascending: true })
    .order('appointment_at', { ascending: true });

  if (error) throw error;
  return data || [];
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
  notes = '',
  dateGiven = null,
  vaccineDuration = null,
  fleaTickInterval = null
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
      appointment_at: appointmentAt ? new Date(appointmentAt).toISOString() : null,
      location: location || null,
      veterinarian: veterinarian || null,
      notes: notes || null,
      date_given: dateGiven || null,
      vaccine_duration: vaccineDuration || null,
      flea_tick_interval: fleaTickInterval || null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateVetEvent({
  eventId,
  eventType,
  eventName,
  dueDate = null,
  appointmentAt = null,
  location = '',
  veterinarian = '',
  notes = '',
  dateGiven = null,
  vaccineDuration = null,
  fleaTickInterval = null
}) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  if (!eventId) throw new Error('Event ID is required');
  if (!eventName?.trim()) throw new Error('Event name is required');

  if (!dueDate && !appointmentAt) {
    throw new Error('Due date or appointment date/time is required');
  }

  const { data, error } = await supabase
    .from('vet_events')
    .update({
      event_type: eventType,
      event_name: eventName.trim(),
      due_date: dueDate || null,
      appointment_at: appointmentAt ? new Date(appointmentAt).toISOString() : null,
      location: location || null,
      veterinarian: veterinarian || null,
      notes: notes || null,
      date_given: dateGiven || null,
      vaccine_duration: vaccineDuration || null,
      flea_tick_interval: fleaTickInterval || null
    })
    .eq('id', eventId)
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