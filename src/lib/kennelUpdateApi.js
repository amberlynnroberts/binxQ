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