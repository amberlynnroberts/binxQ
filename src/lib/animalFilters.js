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
    return animals.filter(isInRescueAnimal);
  }

  if (animalView === 'archived') {
    return animals.filter(isArchivedAnimal);
  }

  return animals;
}

export function getAnimalFilterCounts(animals) {
  return {
    quarantine: animals.filter(a => isQuarantineAnimal(a) && !isArchivedAnimal(a)).length,
    rescue: animals.filter(isInRescueAnimal).length,
    archived: animals.filter(isArchivedAnimal).length,
    all: animals.length
  };
}