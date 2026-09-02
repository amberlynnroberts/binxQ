import { fetchDailyCareSignoffs, signOffCleaning, signOffMedication, todayDateString } from './dailyCareApi';
import { medNeededForShift } from './medUtils';
import { isQuarantineAnimal, isArchivedAnimal, isFosterAnimal } from './animalFilters';

export function buildCareRoundItems(animals = [], signoffs = [], shift = 'AM') {
  const done = new Set((signoffs || []).filter(row => row.shift === shift).map(row => row.animal_id));
  return animals.map(animal => ({
    type: 'care',
    id: `${animal.id}:${shift}:care`,
    animal,
    shift,
    done: done.has(animal.id)
  }));
}

export function buildMedicationRoundItems(animals = [], meds = [], signoffs = [], shift = 'AM') {
  const done = new Set((signoffs || []).filter(row => row.shift === shift).map(row => `${row.animal_id}:${row.medication_id}`));
  const animalById = new Map(animals.map(animal => [animal.id, animal]));

  return (meds || [])
    .filter(med => med.active && medNeededForShift(med, shift))
    .map(med => {
      const animal = animalById.get(med.animalId);
      if (!animal) return null;

      return {
        type: 'med',
        id: `${animal.id}:${med.id}:${shift}:med`,
        animal,
        med,
        shift,
        done: done.has(`${animal.id}:${med.id}`)
      };
    })
    .filter(Boolean);
}

export async function loadRoundSignoffs(shift = 'AM', careDate = todayDateString()) {
  return fetchDailyCareSignoffs({ careDate, shift });
}

// NEW: when the animal being signed off is a flagged nursing mom
// (is_nursing_mom) with a synced litter_group_id, the same care sign-off
// is also written for every other animal sharing that litter_group_id —
// so signing off mom's cleaning/feeding round also covers her kittens,
// without staff having to sign off each kitten individually.
//
// allAnimals must be passed in by the caller (the full roster for the
// current round) so littermates can be found — this function has no
// access to the full animal list on its own.
function findLittermates(animal, allAnimals) {
  if (!animal?.is_nursing_mom || !animal?.litter_group_id) return [];
  return (allAnimals || []).filter(
    a => a.id !== animal.id && a.litter_group_id === animal.litter_group_id
  );
}

export async function completeCareRoundItem({ item, signedBy, notes = '', careDate = todayDateString(), allAnimals = [] }) {
  const littermates = findLittermates(item.animal, allAnimals);
  const targets = [item.animal, ...littermates];

  return Promise.all(
    targets.map(animal =>
      signOffCleaning({
        animalId: animal.id,
        shift: item.shift,
        careDate,
        signedBy,
        notes
      })
    )
  );
}

export function completeMedicationRoundItem({ item, givenBy, notes = '', careDate = todayDateString() }) {
  return signOffMedication({
    animalId: item.animal.id,
    medicationId: item.med.id,
    shift: item.shift,
    careDate,
    givenBy,
    notes
  });
}

// Bulk sign-off: marks every quarantine cat's cleaning task AND every
// active medication needing this shift as done, all in one pass, signed
// under `signedBy`. Scoped explicitly to quarantine cats only — same
// safe filtering (excludes archived/foster) used on the RoundKennels board
// and Meds page, so this can never accidentally sweep in lounge, foster,
// or adopted animals.
//
// allAnimals should be the FULL unfiltered roster (not whatever tab/view
// is currently active), since this needs to find every quarantine cat
// regardless of what the person happens to be looking at right now.
export async function bulkCompleteQuarantineShift({ allAnimals = [], meds = [], shift, signedBy, careDate = todayDateString(), notes = 'Bulk sign-off' }) {
  const quarantineAnimals = allAnimals.filter(a =>
    isQuarantineAnimal(a) && !isArchivedAnimal(a) && !isFosterAnimal(a)
  );
  const quarantineAnimalsWithKennel = quarantineAnimals.filter(a => a.kennel && a.kennel !== '?');
  const quarantineIds = new Set(quarantineAnimals.map(a => a.id));

  const dueMeds = meds.filter(m =>
    m.active && quarantineIds.has(m.animalId) && medNeededForShift(m, shift)
  );

  await Promise.all([
    ...quarantineAnimalsWithKennel.map(a =>
      signOffCleaning({ animalId: a.id, shift, careDate, signedBy, notes })
    ),
    ...dueMeds.map(m =>
      signOffMedication({ animalId: m.animalId, medicationId: m.id, shift, careDate, givenBy: signedBy, notes })
    ),
  ]);

  return {
    animalsSignedOff: quarantineAnimalsWithKennel.length,
    medsSignedOff: dueMeds.length,
  };
}