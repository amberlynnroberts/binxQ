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
  const hasKennel = Boolean(animal?.kennel && animal.kennel !== '?');

  // An explicit staff-set local_status of 'Quarantine' counts, but ONLY
  // alongside a real kennel assignment — every animal gets local_status
  // set to 'Quarantine' by default at original intake, and nothing clears
  // it when Shelterluv's status later changes elsewhere (foster, lounge,
  // etc.), since that sync only ever touches shelterluv_animals.status,
  // never this local column. Without requiring a kennel too, that stale
  // leftover flag would permanently override a cat's real current status
  // even long after they've moved on and had their kennel cleared.
  if (String(animal?.local_status || '').trim() === 'Quarantine' && hasKennel) return true;

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

// A staff-set local_status of 'Quarantine' represents a deliberate "Move
// to Quarantine" action (via the Kennels page) — this should win over
// EVERYTHING else, including the archived-status exclusion. Without this,
// a cat returned after being marked "Healthy in Home" (or any other
// archived status) could never actually show up in Quarantine, since
// isArchivedAnimal checks Shelterluv status independent of local_status.
//
// IMPORTANT: this only counts when a real kennel is also assigned. Every
// animal gets local_status='Quarantine' set by default at original intake
// (see createQuarantineAnimal), and nothing clears that field when
// Shelterluv's status later changes elsewhere (foster, lounge, etc.) —
// Shelterluv sync only updates shelterluv_animals.status, never our local
// local_status column. Without the kennel check, that stale leftover
// value would permanently override a cat's real current status forever,
// even after they've moved on and had their kennel cleared. Requiring a
// kennel too matches how "Move to Quarantine" and the intake form both
// always set kennel + local_status together — so a genuine deliberate
// placement always has both, while a stale leftover only has the flag.
export function isExplicitlyMovedToQuarantine(animal) {
  const flagged = String(animal?.local_status || '').trim() === 'Quarantine';
  const hasKennel = Boolean(animal?.kennel && animal.kennel !== '?');
  return flagged && hasKennel;
}

export function filterAnimalsByView(animals, animalView) {
  if (animalView === 'quarantine') {
    return animals.filter(a => isExplicitlyMovedToQuarantine(a) || (isQuarantineAnimal(a) && !isArchivedAnimal(a)));
  }

  if (animalView === 'rescue') {
    return animals.filter(a => isInRescueAnimal(a) && !isArchivedAnimal(a));
  }

  if (animalView === 'foster') {
    return animals.filter(a => isFosterAnimal(a) && !isArchivedAnimal(a));
  }

  if (animalView === 'archived') {
    // A cat explicitly moved to Quarantine no longer shows under Archived,
    // even if its underlying Shelterluv status still says otherwise —
    // it's been deliberately pulled back into active care.
    return animals.filter(a => isArchivedAnimal(a) && !isExplicitlyMovedToQuarantine(a));
  }

  return animals;
}

export function getAnimalFilterCounts(animals) {
  return {
    quarantine: animals.filter(a => isExplicitlyMovedToQuarantine(a) || (isQuarantineAnimal(a) && !isArchivedAnimal(a))).length,
    rescue: animals.filter(a => isInRescueAnimal(a) && !isArchivedAnimal(a)).length,
    foster: animals.filter(a => isFosterAnimal(a) && !isArchivedAnimal(a)).length,
    archived: animals.filter(a => isArchivedAnimal(a) && !isExplicitlyMovedToQuarantine(a)).length,
    all: animals.length
  };
}