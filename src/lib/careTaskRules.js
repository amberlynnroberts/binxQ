export const AM_CLEANING_DUE_HOUR = 8;
export const PM_CLEANING_DUE_HOUR = 15;
export const END_OF_DAY_HOUR = 20;

export function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function currentHour() {
  return new Date().getHours();
}

export function isCleaningDueNow(shift, hour = currentHour()) {
  if (shift === 'AM') return hour >= AM_CLEANING_DUE_HOUR;
  if (shift === 'PM') return hour >= PM_CLEANING_DUE_HOUR;
  return false;
}

export function shouldShowEndOfDayWarning(hour = currentHour()) {
  return hour >= END_OF_DAY_HOUR;
}

export function buildCleaningSignoffMaps(cleaningSignoffs = []) {
  const map = new Map();
  for (const row of cleaningSignoffs) map.set(`${row.animal_id}:${row.shift}`, row);
  return map;
}

export function getMissingCleaningTasks({ animals = [], cleaningSignoffs = [], hour = currentHour(), includeFuture = false }) {
  const signoffMap = buildCleaningSignoffMaps(cleaningSignoffs);
  const tasks = [];

  for (const animal of animals) {
    const amDone = signoffMap.has(`${animal.id}:AM`);
    const pmDone = signoffMap.has(`${animal.id}:PM`);

    if (!amDone && (includeFuture || isCleaningDueNow('AM', hour))) {
      tasks.push({
        id: `${animal.id}:AM`,
        animalId: animal.id,
        animal,
        shift: 'AM',
        label: 'AM cleaning / feeding / watering',
        dueLabel: 'Due after 8:00 AM'
      });
    }

    if (!pmDone && (includeFuture || isCleaningDueNow('PM', hour))) {
      tasks.push({
        id: `${animal.id}:PM`,
        animalId: animal.id,
        animal,
        shift: 'PM',
        label: 'PM cleaning / feeding / watering',
        dueLabel: 'Due after 3:00 PM'
      });
    }
  }

  return tasks;
}

export function animalHasEndOfDayCleaningWarning({ animalId, cleaningSignoffs = [], hour = currentHour() }) {
  if (!shouldShowEndOfDayWarning(hour)) return false;
  const signoffMap = buildCleaningSignoffMaps(cleaningSignoffs);
  return !signoffMap.has(`${animalId}:AM`) || !signoffMap.has(`${animalId}:PM`);
}
