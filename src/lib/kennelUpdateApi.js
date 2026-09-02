import { supabase, isSupabaseConfigured } from './supabase';

export async function updateAnimalKennelNumber({ animalId, shelterluvId, kennelNumber }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const cleanKennel = String(kennelNumber || '').trim();

  if (!cleanKennel) {
    throw new Error('Kennel number is required');
  }

  const { error: kennelError } = await supabase
    .from('kennels')
    .upsert({ kennel_number: cleanKennel }, { onConflict: 'kennel_number' });

  if (kennelError) throw kennelError;

  const { error: animalError } = await supabase
    .from('animals')
    .update({
      kennel_number: cleanKennel,
      last_synced_at: new Date().toISOString()
    })
    .eq('id', animalId);

  if (animalError) throw animalError;

  if (shelterluvId) {
    await supabase
      .from('shelterluv_animals')
      .update({ location: cleanKennel })
      .eq('shelterluv_id', shelterluvId)
      .then(() => null);
  }

  return cleanKennel;
}

// Separate from updateAnimalKennelNumber on purpose — that function requires
// a non-blank kennel number (a reasonable guard when SETTING one), so it
// can't also be used to clear an assignment. This clears kennel_number back
// to null directly, for cases like an overnight foster stay ending or an
// old quarantine placement no longer being current.
export async function clearAnimalKennelNumber({ animalId, shelterluvId }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const { error: animalError } = await supabase
    .from('animals')
    .update({
      kennel_number: null,
      last_synced_at: new Date().toISOString()
    })
    .eq('id', animalId);

  if (animalError) throw animalError;

  if (shelterluvId) {
    await supabase
      .from('shelterluv_animals')
      .update({ location: null })
      .eq('shelterluv_id', shelterluvId)
      .then(() => null);
  }

  return null;
}

// Flags (or unflags) a foster cat as needing its weekly vet day. Unlike
// kennel number, this has no Shelterluv-side equivalent field, so it's a
// straightforward flip on the local `animals` row only — no shelterluv_id
// param needed, but it's accepted for symmetry with the other update
// functions in this file in case a future use wants it (e.g. logging which
// animal flipped by its Shelterluv id).
export async function toggleAnimalVetDay({ animalId, needsVetDay }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const { error: animalError } = await supabase
    .from('animals')
    .update({
      needs_vet_day: Boolean(needsVetDay),
      last_synced_at: new Date().toISOString()
    })
    .eq('id', animalId);

  if (animalError) throw animalError;

  return Boolean(needsVetDay);
}

export async function addNote(animalId, note, createdBy = 'You') {
  const { error } = await supabase.from('notes').insert({ animal_id: animalId, note, created_by: createdBy });
  if (error) throw error;
}

export async function toggleSymptom(animalId, symptom, isActive) {
  if (isActive) {
    const { error } = await supabase
      .from('symptoms')
      .update({ active: false, resolved_at: new Date().toISOString() })
      .eq('animal_id', animalId)
      .eq('symptom', symptom)
      .eq('active', true);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('symptoms').insert({ animal_id: animalId, symptom, active: true, created_by: 'You' });
    if (error) throw error;
  }
}