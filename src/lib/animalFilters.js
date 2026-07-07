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
  // A cat counts as "quarantine" if Shelterluv says so, OR if staff have
  // assigned it a kennel number for any reason (e.g. a foster cat staying
  // overnight after surgery). The archived-status exclusion applied
  // wherever this is used (!isArchivedAnimal(a)) already takes care of
  // filtering out anything Healthy In Home, Deceased, Adopted, etc.
  //
  // Lounge cats are explicitly excluded here regardless of their kennel
  // field — some lounge animals have `kennel` populated with their
  // location string (e.g. "House of Black Cat Magic") rather than '?',
  // which would otherwise incorrectly satisfy the hasKennel check below
  // and pull lounge cats into the Quarantine tab.
  if (isInRescueAnimal(animal)) return false;

  const hasKennel = Boolean(animal?.kennel && animal.kennel !== '?');
  return status.includes('quarantine') || hasKennel;
}

export function isInRescueAnimal(animal) {
  const status = String(animal?.shelterluv_status || '').trim();
  return status === 'Cat Lounge - HBCM - Available';
}

export function isFosterAnimal(animal) {
  const status = String(animal?.shelterluv_status || '').toLowerCase();
  return status.includes('foster');
}

export function filterAnimalsByView(animals, animalView) {
  if (animalView === 'quarantine') {
    return animals.filter(a => isQuarantineAnimal(a) && !isArchivedAnimal(a));
  }

  if (animalView === 'rescue') {
    return animals.filter(a => isInRescueAnimal(a) && !isArchivedAnimal(a));
  }

  if (animalView === 'foster') {
    return animals.filter(a => isFosterAnimal(a) && !isArchivedAnimal(a));
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
    foster: animals.filter(a => isFosterAnimal(a) && !isArchivedAnimal(a)).length,
    archived: animals.filter(isArchivedAnimal).length,
    all: animals.length
  };
}