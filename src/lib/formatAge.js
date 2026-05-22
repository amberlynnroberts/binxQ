export function formatAge(ageInMonths) {
  const months = Number(ageInMonths || 0);

  if (!months || months < 1) {
    return 'Unknown age';
  }

  if (months < 12) {
    return `${months} month${months === 1 ? '' : 's'}`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) {
    return `${years} year${years === 1 ? '' : 's'}`;
  }

  return `${years} year${years === 1 ? '' : 's'} ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`;
}