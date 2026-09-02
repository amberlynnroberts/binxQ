// Reads the "who's going to the vet" list directly from Amber's Google
// Sheet, live, every time the page loads. The sheet stays the source of
// truth — this module never writes back to it.
//
// Uses the Google Visualization "gviz" CSV export endpoint rather than the
// regular /export?format=csv link: the /export endpoint requires an
// authenticated Google session even on a link-shared sheet (it 401s for a
// plain fetch), while the gviz endpoint is built for exactly this kind of
// public, unauthenticated, cross-origin read and returns CORS headers that
// allow fetching it straight from the browser.
//
// Sheet ID and gid are the only two things that would need to change if
// Amber ever moves this to a different sheet/tab.
const SHEET_ID = '1-_FdyQmCSAyjhE8D7h0wYRXCEZxNPehmgLjY3ubxpEE';
const SHEET_GID = '0';

const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;

// Minimal RFC4180-ish CSV line parser — handles quoted fields, embedded
// commas, and escaped ("") double quotes, which is all this sheet needs.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // skip — \n (handled below) ends the row
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  // last field/row (file may or may not end with a newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(header) {
  return header.trim().toLowerCase();
}

// Turns "HBCM" (any casing/spacing) into the canonical "HBCM" label, and
// anything else non-empty into a foster name. Blank stays blank so a
// continuation row (extra service line for the cat above) doesn't get
// mistaken for a new cat with no name.
function formatLocation(rawFoster) {
  const value = (rawFoster || '').trim();
  if (!value) return '';
  if (value.toUpperCase() === 'HBCM') return 'HBCM';
  return value;
}

// Groups the sheet's rows into one entry per cat. Amber's sheet lists each
// vet service the cat needs on its own row — the cat's name/foster/etc.
// only appear on the first row of the group, and subsequent rows are blank
// in every column except "Services from Vet". So: a non-blank Name starts a
// new cat; a blank Name with a non-blank service extends the current cat's
// needs list.
export function parseVetDayList(csvText) {
  const rows = parseCsv(csvText).filter(r => r.some(cell => cell.trim() !== ''));
  if (rows.length === 0) return [];

  const header = rows[0].map(normalizeHeader);
  const nameIdx = header.indexOf('name');
  const fosterIdx = header.indexOf('foster');
  const notesIdx = header.indexOf('notes');
  const servicesIdx = header.findIndex(h => h.startsWith('services'));

  if (nameIdx === -1 || servicesIdx === -1) {
    throw new Error('Sheet is missing a "Name" or "Services from Vet" column — check the header row.');
  }

  const cats = [];
  let current = null;

  for (const row of rows.slice(1)) {
    const name = (row[nameIdx] || '').trim();
    const service = (row[servicesIdx] || '').trim();
    const notes = notesIdx === -1 ? '' : (row[notesIdx] || '').trim();

    if (name) {
      current = {
        name,
        location: formatLocation(fosterIdx === -1 ? '' : row[fosterIdx]),
        needs: [],
        notes
      };
      cats.push(current);
    } else if (notes && current && !current.notes) {
      // a continuation row can also be where a note was left
      current.notes = notes;
    }

    if (service && current) {
      current.needs.push(service);
    }
  }

  return cats;
}

export async function fetchVetDayList() {
  const response = await fetch(SHEET_CSV_URL);

  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? 'Could not read the vet-list sheet — it may no longer be shared as "Anyone with the link can view".'
        : `Could not read the vet-list sheet (HTTP ${response.status}).`
    );
  }

  const csvText = await response.text();
  return parseVetDayList(csvText);
}
