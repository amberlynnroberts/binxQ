import { supabase, isSupabaseConfigured } from './supabase';

export const symptomOptions = ['Eye discharge','Diarrhea','Sneezing','Vomiting','Not eating','Lethargic','Cleaning overdue','Other'];

// Same archived-status list used in animalFilters.js — kept here too so this
// file doesn't exclude/include animals inconsistently with the rest of the
// app. If you already import this list from a shared file, replace this
// local copy with that import instead of keeping two lists in sync by hand.
const archivedShelterluvStatuses = [
  'transferred out',
  'adopted',
  'healthy in home',
  'deceased',
  'died in care',
  'euthanized',
  'returned to owner',
  'released to colony',
  'released to wild',
  'released to colony / wild',
];

function isArchivedStatus(shelterluvStatus) {
  return archivedShelterluvStatuses.includes(String(shelterluvStatus || '').trim().toLowerCase());
}

function sortKennels(a, b) {
  const an = Number(String(a.kennel || '').replace(/\D/g, '')) || 999;
  const bn = Number(String(b.kennel || '').replace(/\D/g, '')) || 999;
  return an - bn;
}

// PAGINATION FIX:
// Supabase's PostgREST API caps how many rows a single request returns
// (the project's "Max Rows" setting, default 1000). A plain
// `.select('*')` silently truncates once a table exceeds that cap — it
// does NOT error, it just quietly hands back a partial result. Since our
// animals table sorts by kennel_number ascending and Postgres sorts NULLs
// last by default, cats with no kennel assigned (e.g. lounge cats) are
// exactly the rows that land at the end of the result set and get cut off.
//
// This helper walks a query in pages using .range() until a page comes
// back with fewer rows than the page size, guaranteeing we get every row
// no matter how large the table grows or what the project's Max Rows
// setting is.
async function fetchAllRows(queryBuilderFn, pageSize = 1000) {
  let allRows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await queryBuilderFn().range(from, to);
    if (error) throw error;

    const rows = data || [];
    allRows = allRows.concat(rows);

    if (rows.length < pageSize) break; // last page
    from += pageSize;
  }

  return allRows;
}

export async function fetchKennelCheckData({ includeRemoved = false } = {}) {
  if (!isSupabaseConfigured) {
    return { animals: [], meds: [], notes: [], checks: [], dbStatus: 'Supabase not configured' };
  }

  const [appAnimals, shelterluvAnimals, symptomsRows, medsRows, notesRows] = await Promise.all([
    fetchAllRows(() => supabase.from('animals').select('*').order('kennel_number', { ascending: true })),
    fetchAllRows(() => supabase.from('shelterluv_animals').select('*')),
    fetchAllRows(() => supabase.from('symptoms').select('*').eq('active', true)),
    fetchAllRows(() => supabase.from('medications').select('*').eq('active', true)),
    fetchAllRows(() => supabase.from('notes').select('*').order('created_at', { ascending: false })),
  ]);

  const shelterluvById = new Map((shelterluvAnimals || []).map(a => [a.shelterluv_id, a]));
  const symptomsByAnimal = new Map();

  for (const symptom of symptomsRows || []) {
    const list = symptomsByAnimal.get(symptom.animal_id) || [];
    list.push(symptom.symptom);
    symptomsByAnimal.set(symptom.animal_id, list);
  }

  // Create a map of medications by animal ID
  const medicationsByAnimal = new Map();
  for (const med of medsRows || []) {
    const list = medicationsByAnimal.get(med.animal_id) || [];
    list.push({
      id: med.id,
      name: med.medication_name,
      dosage: med.dosage_notes || '',
      schedule: med.schedule || '',
      nextDue: med.next_due || '',
      startDate: med.start_date || null,
      endDate: med.end_date || null,
      active: med.active
    });
    medicationsByAnimal.set(med.animal_id, list);
  }

  const animals = (appAnimals || [])
    // Exclude based on the animal's CURRENT Shelterluv status (adopted,
    // deceased, healthy in home, etc.) rather than the local `local_status`
    // flag, which can go stale if an animal returns to custody after being
    // marked removed (e.g. foster -> lounge) and nothing clears it.
    .filter(row => {
      if (includeRemoved) return true;
      const shelterluvStatus = shelterluvById.get(row.shelterluv_id)?.status || '';
      return !isArchivedStatus(shelterluvStatus);
    })
    .map(row => {
      const s = shelterluvById.get(row.shelterluv_id);

      const shelterluvStatus = s?.status || '';

      const appStatus =
        shelterluvStatus.toLowerCase().includes('quarantine')
          ? 'Quarantine'
          : shelterluvStatus.toLowerCase().includes('cat lounge')
            ? 'In Rescue'
            : row.local_status || shelterluvStatus || 'Monitor';

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
        neutered_spayed: s?.neutered_spayed || '',
        // FIXED: 'neutered_spayed' above isn't a real column on
        // shelterluv_animals — the actual altered/fixed status lives in
        // the 'altered' boolean column, which was never being exposed on
        // the returned animal object at all. Anything reading
        // animal.altered (e.g. the Kennel Card's Spayed/Neutered field)
        // was always getting undefined, hence always showing "Unknown"
        // regardless of the real value.
        altered: s?.altered ?? null,
        primary_breed: s?.primary_breed || null,
        // FIXED: microchip_number is sometimes stored as a JSON STRING
        // (e.g. '{"Id":"941010002644027","Issuer":"...",...}'), not an
        // actual parsed object — the old `typeof === 'object'` check never
        // matched that case, so it fell through to returning the whole raw
        // unparsed string. This now also tries to parse a string that
        // looks like JSON and pulls out just the Id either way.
        microchip_number: (() => {
          const raw = s?.microchip_number;
          if (!raw) return '';
          if (typeof raw === 'object') return raw.Id || '';
          if (typeof raw === 'string') {
            const trimmed = raw.trim();
            if (trimmed.startsWith('{')) {
              try {
                return JSON.parse(trimmed).Id || '';
              } catch {
                return trimmed;
              }
            }
            return trimmed;
          }
          return '';
        })(),
        status: appStatus,
        local_status: row.local_status || '',
        shelterluv_status: shelterluvStatus,
        intake: s?.intake_date || '',
        photo: s?.photo_url || '🐱',
        symptoms: symptomsByAnimal.get(row.id) || [],
        medications: medicationsByAnimal.get(row.id) || [],
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
    startDate: m.start_date || null,
    endDate: m.end_date || null,
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

export async function findAnimalsByName(name) {
  if (!isSupabaseConfigured || !name?.trim()) return [];

  const { data, error } = await supabase
    .from('shelterluv_animals')
    .select('shelterluv_id, name, status, intake_date')
    .ilike('name', name.trim());

  if (error) throw error;
  return data || [];
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