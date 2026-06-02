import { fetchDailyCareSignoffs, signOffCleaning, signOffMedication, todayDateString } from './dailyCareApi';
import { medNeededForShift } from './medUtils';

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

export function completeCareRoundItem({ item, signedBy, notes = '', careDate = todayDateString() }) {
  return signOffCleaning({
    animalId: item.animal.id,
    shift: item.shift,
    careDate,
    signedBy,
    notes
  });
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