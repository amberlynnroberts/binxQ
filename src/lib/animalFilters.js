export const archivedShelterluvStatuses = [
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

export function getAnimalStatus(animal) {
  return String(
    animal?.shelterluv_status ||
    animal?.status ||
    ''
  ).trim().toLowerCase();
}

/**
 * Check if an animal should be available for vet appointments
 * Excludes: Adopted, Happy in Home, Deceased
 * Includes: Everything else
 */
export function isInCustodyAnimal(animal) {
  const status = animal.shelterluv_status || animal.status || '';
  const statusLower = status.toLowerCase();
  
  // Exclude these statuses
  if (statusLower.includes('adopted')) return false;
  if (statusLower.includes('happy in home')) return false;
  if (statusLower.includes('deceased')) return false;
  
  return true;
}

export function isArchivedAnimal(animal) {
  return archivedShelterluvStatuses.includes(getAnimalStatus(animal));
}

export function isQuarantineAnimal(animal) {
  const status = String(animal?.shelterluv_status || '').toLowerCase();
  return status.includes('quarantine');
}

export function isInRescueAnimal(animal) {
  const status = String(animal?.shelterluv_status || '').trim();
  return status === 'Cat Lounge - HBCM - Available';
}

export function filterAnimalsByView(animals, animalView) {
  if (animalView === 'quarantine') {
    return animals.filter(a => isQuarantineAnimal(a) && !isArchivedAnimal(a));
  }

  if (animalView === 'rescue') {
    return animals.filter(a => isInRescueAnimal(a) && !isArchivedAnimal(a));
  }

  if (animalView === 'archived') {
    return animals.filter(isArchivedAnimal);
  }

  return animals;
}

export function getAnimalFilterCounts(animals) {
  return {
    quarantine: animals.filter(a => isQuarantineAnimal(a) && !isArchivedAnimal(a)).length,
    rescue: animals.filter(a => isInRescueAnimal(a) && !isArchivedAnimal(a)).length,
    archived: animals.filter(isArchivedAnimal).length,
    all: animals.length
  };
}