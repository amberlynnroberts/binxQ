import { supabase, isSupabaseConfigured } from './supabase';

export const symptomOptions = ['Eye discharge','Diarrhea','Sneezing','Vomiting','Not eating','Lethargic','Cleaning overdue','Other'];

function sortKennels(a, b) {
  const an = Number(String(a.kennel || '').replace(/\D/g, '')) || 999;
  const bn = Number(String(b.kennel || '').replace(/\D/g, '')) || 999;
  return an - bn;
}

export async function fetchKennelCheckData({ includeRemoved = false } = {}) {
  if (!isSupabaseConfigured) {
    return { animals: [], meds: [], notes: [], checks: [], dbStatus: 'Supabase not configured' };
  }

  const [{ data: appAnimals, error: animalsError }, { data: shelterluvAnimals, error: shelterluvError }, { data: symptomsRows, error: symptomsError }, { data: medsRows, error: medsError }, { data: notesRows, error: notesError }] = await Promise.all([
    supabase.from('animals').select('*').order('kennel_number', { ascending: true }),
    supabase.from('shelterluv_animals').select('*'),
    supabase.from('symptoms').select('*').eq('active', true),
    supabase.from('medications').select('*').eq('active', true),
    supabase.from('notes').select('*').order('created_at', { ascending: false })
  ]);

  if (animalsError) throw animalsError;
  if (shelterluvError) throw shelterluvError;
  if (symptomsError) throw symptomsError;
  if (medsError) throw medsError;
  if (notesError) throw notesError;

  const shelterluvById = new Map((shelterluvAnimals || []).map(a => [a.shelterluv_id, a]));
  const symptomsByAnimal = new Map();

  for (const symptom of symptomsRows || []) {
    const list = symptomsByAnimal.get(symptom.animal_id) || [];
    list.push(symptom.symptom);
    symptomsByAnimal.set(symptom.animal_id, list);
  }

  const animals = (appAnimals || [])
    .filter(row => includeRemoved || row.local_status !== 'Removed')
    .map(row => {
      const s = shelterluvById.get(row.shelterluv_id);
      return {
        id: row.id,
        shelterluv_id: row.shelterluv_id,
        kennel: row.kennel_number || '?',
        location: s?.location || '',
        name: s?.name || 'Unknown',
        desc: [s?.color, s?.species].filter(Boolean).join(' ') || 'Unknown',
        species: s?.species || 'Cat',
        sex: s?.sex || 'Unknown',
        age: s?.age || '',
        status: row.local_status || s?.status || 'Monitor',
        local_status: row.local_status || '',
        shelterluv_status: s?.status || '',
        intake: s?.intake_date || '',
        photo: s?.photo_url || '🐱',
        symptoms: symptomsByAnimal.get(row.id) || [],
        last_synced_at: row.last_synced_at,
        removed_at: row.removed_at,
        removal_reason: row.removal_reason
      };
    })
    .sort(sortKennels);

  const meds = (medsRows || []).map(m => ({
    id: m.id,
    animalId: m.animal_id,
    name: m.medication_name,
    dose: m.dosage_notes || '',
    schedule: m.schedule || '',
    nextDue: m.next_due || '',
    active: m.active
  }));

  const notes = (notesRows || []).map(n => ({
    id: n.id,
    animalId: n.animal_id,
    by: n.created_by || 'Unknown',
    at: new Date(n.created_at).toLocaleString(),
    text: n.note
  }));

  return { animals, meds, notes, checks: [], dbStatus: `Supabase connected (${animals.length} active animals)` };
}

export async function syncFromMockShelterluv() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('sync_from_mock_shelterluv');
  if (error) throw error;
  return data;
}

export async function createQuarantineAnimal(form) {
  const shelterluvId = form.shelterluv_id || `KC-${Date.now()}`;

  const { error: kennelError } = await supabase
    .from('kennels')
    .upsert({ kennel_number: form.kennel_number }, { onConflict: 'kennel_number' });
  if (kennelError) throw kennelError;

  const { data: shelterluvAnimal, error: shelterluvError } = await supabase
    .from('shelterluv_animals')
    .insert({
      shelterluv_id: shelterluvId,
      name: form.name,
      species: form.species || 'Cat',
      sex: form.sex || 'Unknown',
      age: form.age || '',
      color: form.color || '',
      intake_date: form.intake_date || new Date().toISOString().slice(0, 10),
      status: 'In Shelter',
      location: form.kennel_number
    })
    .select()
    .single();

  if (shelterluvError) throw shelterluvError;

  const { error: appError } = await supabase
    .from('animals')
    .insert({
      shelterluv_id: shelterluvAnimal.shelterluv_id,
      kennel_number: form.kennel_number,
      local_status: form.local_status || 'Quarantine',
      last_synced_at: new Date().toISOString()
    });

  if (appError) throw appError;
}

export async function updateQuarantineAnimal(animalId, shelterluvId, updates) {
  if (updates.kennel_number) {
    const { error: kennelError } = await supabase
      .from('kennels')
      .upsert({ kennel_number: updates.kennel_number }, { onConflict: 'kennel_number' });
    if (kennelError) throw kennelError;
  }

  const animalUpdates = { last_synced_at: new Date().toISOString() };
  if ('kennel_number' in updates) animalUpdates.kennel_number = updates.kennel_number;
  if ('local_status' in updates) animalUpdates.local_status = updates.local_status;

  const { error: animalError } = await supabase.from('animals').update(animalUpdates).eq('id', animalId);
  if (animalError) throw animalError;

  const shelterluvUpdates = {};
  ['name', 'species', 'sex', 'age', 'color', 'intake_date'].forEach(key => {
    if (key in updates) shelterluvUpdates[key] = updates[key];
  });
  if ('kennel_number' in updates) shelterluvUpdates.location = updates.kennel_number;

  if (Object.keys(shelterluvUpdates).length) {
    const { error: shelterluvError } = await supabase
      .from('shelterluv_animals')
      .update(shelterluvUpdates)
      .eq('shelterluv_id', shelterluvId);
    if (shelterluvError) throw shelterluvError;
  }
}

export async function removeFromQuarantine(animalId, reason = 'cleared') {
  const { error } = await supabase
    .from('animals')
    .update({
      local_status: 'Removed',
      kennel_number: null,
      removed_at: new Date().toISOString(),
      removal_reason: reason,
      last_synced_at: new Date().toISOString()
    })
    .eq('id', animalId);
  if (error) throw error;
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

export async function uploadAnimalPhoto({ animalId, shelterluvId, file }) {
  if (!file) throw new Error('No file selected');

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${shelterluvId || animalId}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from('animal-photos').upload(filePath, file, { cacheControl: '3600', upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('animal-photos').getPublicUrl(filePath);
  const photoUrl = data.publicUrl;

  const { error: updateError } = await supabase
    .from('shelterluv_animals')
    .update({ photo_url: photoUrl })
    .eq('shelterluv_id', shelterluvId);
  if (updateError) throw updateError;

  return photoUrl;
}

export async function removeAnimalPhoto({ shelterluvId }) {
  const { error } = await supabase.from('shelterluv_animals').update({ photo_url: null }).eq('shelterluv_id', shelterluvId);
  if (error) throw error;
}
