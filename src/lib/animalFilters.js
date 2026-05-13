export const archivedShelterluvStatuses = [
  'Transferred Out',
  'Adopted',
  'Deceased',
  'Returned to Owner',
  'Euthanized'
];

export function isArchivedAnimal(animal) {
  const status = animal?.shelterluv_status || animal?.status || '';
  return archivedShelterluvStatuses.includes(status);
}

export function isQuarantineAnimal(animal) {
  const localStatus = String(animal?.status || animal?.local_status || '').toLowerCase();
  const kennel = String(animal?.kennel || '').toLowerCase();
  const location = String(animal?.location || '').toLowerCase();

  return (
    localStatus.includes('quarantine') ||
    kennel.includes('quarantine') ||
    location.includes('quarantine')
  );
}

export function isInRescueAnimal(animal) {
  return !isArchivedAnimal(animal);
}

export function filterAnimalsByView(animals, animalView) {
  if (animalView === 'quarantine') {
    return animals.filter(animal => isQuarantineAnimal(animal) && !isArchivedAnimal(animal));
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
    quarantine: animals.filter(animal => isQuarantineAnimal(animal) && !isArchivedAnimal(animal)).length,
    rescue: animals.filter(isInRescueAnimal).length,
    archived: animals.filter(isArchivedAnimal).length,
    all: animals.length
  };
}
