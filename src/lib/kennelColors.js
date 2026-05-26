const kennelColors = [
  'kennelRed',
  'kennelBlue',
  'kennelGreen',
  'kennelPurple',
  'kennelOrange',
  'kennelPink',
  'kennelTeal',
  'kennelYellow'
];

export function getKennelColorClass(kennel) {
  const text = String(kennel || '').trim();

  if (!text) return 'kennelDefault';

  const match = text.match(/(\d+)\s*$/);
  const number = match ? Number(match[1]) : NaN;

  if (!Number.isNaN(number)) {
    return kennelColors[(number - 1) % kennelColors.length];
  }

  return 'kennelDefault';
}