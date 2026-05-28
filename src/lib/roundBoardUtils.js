export function getKennelKey(animal) {
  return animal?.kennel || animal?.kennel_number || 'Unassigned';
}

export function sortKennelNames(a, b) {
  const an = Number(String(a).match(/(\d+)\s*$/)?.[1] || 9999);
  const bn = Number(String(b).match(/(\d+)\s*$/)?.[1] || 9999);
  if (an !== bn) return an - bn;
  return String(a).localeCompare(String(b));
}

export function groupAnimalsByKennel(animals = []) {
  const allKennels = Array.from(
    { length: 9 },
    (_, i) => `Quarantine Kennel ${i + 1}`
  );

  const groups = new Map();

  // create every kennel first
  for (const kennel of allKennels) {
    groups.set(kennel, []);
  }

  // place cats into kennels
  for (const animal of animals) {
    const kennel = getKennelKey(animal);

    if (!groups.has(kennel)) {
      groups.set(kennel, []);
    }

    groups.get(kennel).push(animal);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => sortKennelNames(a, b))
    .map(([kennel, cats]) => ({
      kennel,
      cats: cats.sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''))
      )
    }));
}
export function getCompletedIdsFromSignoffs(signoffs = [], shift = 'AM') {
  return new Set(
    (signoffs || [])
      .filter(row => row.shift === shift)
      .map(row => row.animal_id)
  );
}

export function getCompletedMedicationKeys(signoffs = [], shift = 'AM') {
  return new Set(
    (signoffs || [])
      .filter(row => row.shift === shift)
      .map(row => `${row.animal_id}:${row.medication_id}`)
  );
}

export function getKennelProgress({ cats = [], completedAnimalIds = new Set() }) {
  const total = cats.length;
  const completed = cats.filter(cat => completedAnimalIds.has(cat.id)).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    remaining: Math.max(total - completed, 0),
    percent,
    done: total > 0 && completed === total
  };
}
