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

/**
 * @param {Object} animal - animal record (expects name, species, sex, age,
 *   desc/color, microchip_number, shelterluv_id)
 * @param {Array} vetEvents - full vet_events rows for this animal
 * @param {Object} [options]
 * @param {string} [options.orgName] - shown in the header
 */
export function generateAdoptionRecordPdf(animal, vetEvents = [], options = {}) {
  const orgName = options.orgName || 'House of Black Cat Magic Animal Rescue';
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 56;

  // --- Header ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(orgName, marginX, y);

  y += 22;
  doc.setFontSize(14);
  doc.setTextColor(90, 90, 90);
  doc.text('Veterinary Care Record', marginX, y);
  doc.setTextColor(0, 0, 0);

  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 26;

  // --- Animal info block ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(animal?.name || 'Unknown', marginX, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  const infoLines = [
    [`Species:`, animal?.species || 'Cat'],
    [`Sex:`, animal?.sex || 'Unknown'],
    [`Age:`, animal?.age ? `${animal.age} months` : 'Unknown'],
    [`Description:`, animal?.desc || animal?.color || '—'],
    [`Microchip #:`, (typeof animal?.microchip_number === 'object'
      ? animal?.microchip_number?.Id
      : animal?.microchip_number) || 'Not recorded'],
    [`Record ID:`, animal?.shelterluv_id || animal?.id || '—'],
  ];

  const colGap = 130;
  for (const [label, value] of infoLines) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), marginX + colGap, y);
    y += 16;
  }

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Veterinary History', marginX, y);
  y += 8;
  doc.setDrawColor(200, 200, 200);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;

  // --- Vet events table ---
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
    const colWidths = { date: 130, type: 90, name: 150, vet: 100 };
    const rowHeight = 18;
    const pageBottom = doc.internal.pageSize.getHeight() - 60;

    // Table header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setFillColor(240, 240, 240);
    doc.rect(marginX, y - 12, pageWidth - marginX * 2, 18, 'F');
    doc.text('Date', marginX + 4, y);
    doc.text('Type', marginX + colWidths.date, y);
    doc.text('Event', marginX + colWidths.date + colWidths.type, y);
    doc.text('Veterinarian / Location', marginX + colWidths.date + colWidths.type + colWidths.name, y);
    y += rowHeight;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);

    for (const event of sorted) {
      if (y > pageBottom) {
        doc.addPage();
        y = 56;
      }

      const dateStr = formatEventDate(event);
      const typeStr = event.event_type || '—';
      const nameStr = event.event_name || '—';
      const vetLocStr = [event.veterinarian, event.location].filter(Boolean).join(' · ') || '—';
      const statusStr = event.completed ? ' (Completed)' : '';

      doc.text(dateStr, marginX + 4, y, { maxWidth: colWidths.date - 6 });
      doc.text(typeStr, marginX + colWidths.date, y, { maxWidth: colWidths.type - 6 });
      doc.text(`${nameStr}${statusStr}`, marginX + colWidths.date + colWidths.type, y, { maxWidth: colWidths.name - 6 });
      doc.text(vetLocStr, marginX + colWidths.date + colWidths.type + colWidths.name, y, { maxWidth: colWidths.vet - 6 });

      y += rowHeight;

      if (event.notes) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(110, 110, 110);
        doc.text(`Note: ${event.notes}`, marginX + 4, y, { maxWidth: pageWidth - marginX * 2 - 8 });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        y += rowHeight;
      }
    }
  }

  // --- Footer ---
  const footerY = doc.internal.pageSize.getHeight() - 36;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(140, 140, 140);
  doc.text(
    `Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} — ${orgName}`,
    marginX,
    footerY
  );

  const safeName = (animal?.name || 'animal').replace(/[^a-z0-9]+/gi, '_');
  doc.save(`${safeName}_veterinary_record.pdf`);
}