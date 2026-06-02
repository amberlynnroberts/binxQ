export function medNeededForShift(med, shift) {
  const schedule = String(med.schedule || '').toLowerCase();

  // Don't show if start_date is in the future
  if (med.startDate) {
    const start = new Date(med.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    if (start > today) return false;
  }

  // Don't show if end_date has passed
  if (med.endDate) {
    const end = new Date(med.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (end < today) return false;
  }

  if (shift === 'AM') {
    return schedule.includes('am') || schedule.includes('morning') ||
           schedule.includes('daily') || schedule.includes('every 12') ||
           schedule.includes('every 8');
  }

  return schedule.includes('pm') || schedule.includes('evening') ||
         schedule.includes('night') || schedule.includes('every 12') ||
         schedule.includes('every 8');
}