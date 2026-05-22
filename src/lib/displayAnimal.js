export function isQuarantineAnimalDisplay(animal) {
  const status = String(
    animal?.shelterluv_status ||
    animal?.status ||
    ''
  ).toLowerCase();

  return status.includes('quarantine');
}

export function getDisplayLocation(animal) {
  const status = String(animal?.shelterluv_status || '').trim();

  if (status.toLowerCase().includes('quarantine')) {
    return 'Quarantine';
  }

  if (status === 'Cat Lounge - HBCM - Available') {
    return 'Cat Lounge';
  }

  return animal?.location || animal?.kennel || '';
}

export function getDisplayKennel(animal) {
  if (isQuarantineAnimalDisplay(animal)) {
    return '';
  }

  return animal?.kennel || '';
}