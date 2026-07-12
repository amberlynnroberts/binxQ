// lib/adoptionRecordPdf.js
//
// Generates a downloadable PDF of an animal's complete veterinary history
// (vaccines, appointments, surgeries, follow-ups, etc.) for adopters' records.
//
// Install first: npm install jspdf

import jsPDF from 'jspdf';

function formatEventDate(event) {
  if (event.appointment_at) {
    return new Date(event.appointment_at).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'medium',
      timeStyle: 'short'
    }) + ' ET';
  }
  if (event.due_date) {
    return new Date(`${event.due_date}T00:00:00`).toLocaleDateString('en-US', {
      dateStyle: 'medium'
    });
  }
  return 'No date recorded';
}

function extractMicrochipId(microchipValue) {
  if (!microchipValue) return 'Not recorded';

  // Already a parsed object: { Id, Issuer, ImplantUnixTime }
  if (typeof microchipValue === 'object') {
    return microchipValue.Id || 'Not recorded';
  }

  // Stored as a JSON string (e.g. '{"Id":"941...","Issuer":"..."}') rather
  // than an actual object — this is what was showing up raw and unparsed
  // in the PDF. Try to parse it and pull out just the Id.
  if (typeof microchipValue === 'string') {
    const trimmed = microchipValue.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed.Id || 'Not recorded';
      } catch {
        // Not valid JSON after all — fall through and just show the raw
        // string rather than silently dropping it.
        return trimmed;
      }
    }
    return trimmed;
  }

  return 'Not recorded';
}

function formatAgeDisplay(ageInMonths) {
  const months = Number(ageInMonths);
  if (!ageInMonths || Number.isNaN(months) || months <= 0) return 'Unknown';

  if (months < 12) {
    return `${months} month${months === 1 ? '' : 's'}`;
  }

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const yearsStr = `${years} year${years === 1 ? '' : 's'}`;
  if (remMonths === 0) return yearsStr;
  return `${yearsStr}, ${remMonths} month${remMonths === 1 ? '' : 's'}`;
}

function formatPlainDate(dateString) {
  if (!dateString) return null;
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { dateStyle: 'medium' });
}

function buildDetailLine(event) {
  if (!event.date_given && !event.vaccine_duration && !event.flea_tick_interval) return null;

  const givenStr = formatPlainDate(event.date_given);
  const cadenceStr = event.vaccine_duration
    ? `${event.vaccine_duration} duration`
    : event.flea_tick_interval
      ? (event.flea_tick_interval === 'other' ? 'custom interval' : `${event.flea_tick_interval} interval`)
      : null;
  const nextDueStr = formatPlainDate(event.due_date);

  return [
    givenStr ? `Given: ${givenStr}` : null,
    cadenceStr,
    nextDueStr ? `Next due: ${nextDueStr}` : null,
  ].filter(Boolean).join('   •   ');
}

function wrappedLineCount(doc, text, maxWidth) {
  if (!text) return 0;
  return doc.splitTextToSize(text, maxWidth).length;
}

/**
 * @param {Object} animal
 * @param {Array} vetEvents
 * @param {Object} [options]
 * @param {string} [options.orgName]
 */
export function generateAdoptionRecordPdf(animal, vetEvents = [], options = {}) {
  const orgName = options.orgName || "Binx's Home for Black Cats";
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const contentWidth = pageWidth - marginX * 2;
  const pageBottom = pageHeight - 56;
  let y = 56;

  // --- Header ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(orgName, marginX, y);

  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(100, 100, 100);
  doc.text('Veterinary Care Record', marginX, y);
  doc.setTextColor(0, 0, 0);

  y += 16;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(1);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 32;

  // --- Animal info card ---
  const infoBoxTop = y - 20;

  const infoPairs = [
    ['Species', animal?.species || 'Cat'],
    ['Sex', animal?.sex || 'Unknown'],
    ['Age', formatAgeDisplay(animal?.age)],
    ['Description', animal?.desc || animal?.color || '—'],
    ['Microchip #', extractMicrochipId(animal?.microchip_number)],
    ['Record ID', animal?.shelterluv_id || animal?.id || '—'],
  ];

  const infoColWidth = (contentWidth - 32) / 2;
  const infoRowHeight = 20;
  const nameLineY = infoBoxTop + 26;
  const infoStartY = nameLineY + 26;

  const infoRows = Math.ceil(infoPairs.length / 2);
  const boxBottom = infoStartY + infoRows * infoRowHeight - infoRowHeight + 14;

  doc.setDrawColor(225, 225, 225);
  doc.setFillColor(250, 250, 251);
  doc.roundedRect(marginX, infoBoxTop, contentWidth, boxBottom - infoBoxTop, 8, 8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(0, 0, 0);
  doc.text(animal?.name || 'Unknown', marginX + 16, nameLineY);

  doc.setFontSize(10.5);
  infoPairs.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = marginX + 16 + col * (infoColWidth + 32);
    const rowY = infoStartY + row * infoRowHeight;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(90, 90, 90);
    doc.text(`${label}:`, x, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(String(value), x + 78, rowY, { maxWidth: infoColWidth - 78 });
  });

  y = boxBottom + 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text('Veterinary History', marginX, y);
  y += 8;
  doc.setDrawColor(210, 210, 210);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 24;

  // --- Vet events, one clearly separated card per event ---
  const sorted = [...vetEvents].sort((a, b) => {
    const aDate = a.appointment_at || a.due_date || '';
    const bDate = b.appointment_at || b.due_date || '';
    return String(aDate).localeCompare(String(bDate));
  });

  if (sorted.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text('No veterinary events recorded.', marginX, y);
  } else {
    const padX = 14;
    const padTop = 14;
    const lineGap = 15;
    const cardGap = 12;
    const innerWidth = contentWidth - padX * 2;

    for (const event of sorted) {
      const dateStr = formatEventDate(event);
      const typeStr = (event.event_type || '—').toUpperCase();
      const nameStr = event.event_name || '—';
      const vetLocStr = [event.veterinarian, event.location].filter(Boolean).join('  ·  ');
      const detailStr = buildDetailLine(event);
      const noteStr = event.notes ? `Note: ${event.notes}` : null;
      const statusStr = event.completed ? 'Completed' : null;

      const nameLines = wrappedLineCount(doc, nameStr, innerWidth - 90);
      const vetLocLines = vetLocStr ? wrappedLineCount(doc, vetLocStr, innerWidth) : 0;
      const detailLines = detailStr ? wrappedLineCount(doc, detailStr, innerWidth) : 0;
      const noteLines = noteStr ? wrappedLineCount(doc, noteStr, innerWidth) : 0;

      const totalLines = Math.max(nameLines, 1) + vetLocLines + detailLines + noteLines;
      const cardHeight = padTop + (totalLines * lineGap) + 10;

      if (y + cardHeight > pageBottom) {
        doc.addPage();
        y = 56;
      }

      const cardTop = y;

      doc.setFillColor(252, 252, 253);
      doc.setDrawColor(228, 228, 230);
      doc.roundedRect(marginX, cardTop, contentWidth, cardHeight, 6, 6, 'FD');

      doc.setFillColor(event.completed ? 150 : 120, event.completed ? 190 : 140, event.completed ? 150 : 220);
      doc.rect(marginX, cardTop, 4, cardHeight, 'F');

      let cy = cardTop + padTop;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 30, 30);
      doc.text(dateStr, marginX + padX, cy);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 130);
      doc.text(typeStr, marginX + contentWidth - padX, cy, { align: 'right' });

      cy += lineGap;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(nameStr, marginX + padX, cy, { maxWidth: innerWidth - 90 });

      if (statusStr) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(60, 150, 90);
        doc.text(statusStr, marginX + contentWidth - padX, cy, { align: 'right' });
      }

      cy += lineGap * Math.max(nameLines, 1);

      if (vetLocStr) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 100, 100);
        doc.text(vetLocStr, marginX + padX, cy, { maxWidth: innerWidth });
        cy += lineGap * vetLocLines;
      }

      if (detailStr) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(70, 90, 140);
        doc.text(detailStr, marginX + padX, cy, { maxWidth: innerWidth });
        cy += lineGap * detailLines;
      }

      if (noteStr) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(noteStr, marginX + padX, cy, { maxWidth: innerWidth });
      }

      doc.setTextColor(0, 0, 0);
      y = cardTop + cardHeight + cardGap;
    }
  }

  // --- Footer (every page) ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const footerY = pageHeight - 32;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} — ${orgName}`,
      marginX,
      footerY
    );
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - marginX, footerY, { align: 'right' });
  }

  const safeName = (animal?.name || 'animal').replace(/[^a-z0-9]+/gi, '_');
  doc.save(`${safeName}_veterinary_record.pdf`);
}