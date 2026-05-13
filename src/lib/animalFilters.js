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
  return (
    animal?.shelterluv_status === 'Quarantine - HBCM - not available'
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
