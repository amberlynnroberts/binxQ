import React, { useState, useMemo } from 'react';
import { ChevronDown, Printer } from 'lucide-react';

export default function QuarantineCardGenerator({ data, reload }) {
  const [expandedCat, setExpandedCat] = useState(null);
  const [cardData, setCardData] = useState({});

  const quarantineCats = useMemo(() => {
    return (data?.animals || []).filter(a => a.status === 'Quarantine').sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.animals]);

  const handleCardDataChange = (catId, field, value) => {
    setCardData(prev => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        [field]: value
      }
    }));
  };

  const generateDateArray = (intakeDate, numDays = 14) => {
    const dates = [];
    const startDate = new Date(intakeDate);
    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const convertAge = (ageStr) => {
    if (!ageStr) return '';
    
    // Remove any non-numeric characters
    const age = parseInt(ageStr.toString().replace(/\D/g, ''));
    if (isNaN(age)) return ageStr;
    
    // Assume age is in months, convert to most appropriate unit
    if (age >= 12) {
      const years = Math.round(age / 12);
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else if (age >= 4) {
      return `${age} month${age !== 1 ? 's' : ''}`;
    } else {
      return `${age} month${age !== 1 ? 's' : ''}`;
    }
  };

  const initializeCatData = (cat) => {
    if (!cardData[cat.id]) {
      setCardData(prev => ({
        ...prev,
        [cat.id]: {
          food_type: 'wet_dry',
          portion_age: 'kitten',
          amount: '',
          frequency: '2x daily',
          notes: ''
        }
      }));
    }
  };

  const handlePrint = (catId) => {
    const printWindow = window.open('', '_blank');
    const cat = quarantineCats.find(c => c.id === catId);
    const currentData = cardData[catId];
    
    if (!cat || !currentData) return;

    const html = generatePrintHTML(cat, currentData);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const generatePrintHTML = (cat, data) => {
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    };

    const formatShortDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    };

    const intakeDates = generateDateArray(new Date(), 10);

    const careLogHTML = intakeDates.map((date, idx) => `
      <tr style="height: 0.12in;">
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0px 1px; text-align: center; font-size: 4.5pt; font-weight: bold; line-height: 0.5; vertical-align: middle;">${formatShortDate(date)}</td>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0px 1px; text-align: center; font-size: 4.5pt; line-height: 0.5; vertical-align: middle;">AM</td>
        <td style="border-bottom: 1px solid #000; padding: 0px 1px; text-align: center; width: 0.3in; line-height: 0.5; vertical-align: middle; font-size: 4.5pt; font-weight: bold;"></td>
      </tr>
      <tr style="height: 0.12in;">
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0px 1px; text-align: center; font-size: 4.5pt; font-weight: bold; line-height: 0.5; vertical-align: middle;">${formatShortDate(date)}</td>
        <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0px 1px; text-align: center; font-size: 4.5pt; line-height: 0.5; vertical-align: middle;">PM</td>
        <td style="border-bottom: 1px solid #000; padding: 0px 1px; text-align: center; width: 0.3in; line-height: 0.5; vertical-align: middle; font-size: 4.5pt; font-weight: bold;"></td>
      </tr>
    `).join('');

    const medsHTML = (cat.medications && cat.medications.length > 0) ? 
      `<table style="width: 100%; border-collapse: collapse; font-size: 5pt;">
        <thead>
          <tr>
            <th style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0.5px 1px; text-align: left; font-size: 4.5pt; font-weight: bold;">MEDICATION</th>
            <th style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0.5px 1px; text-align: center; font-size: 4.5pt; font-weight: bold;">DATE</th>
            <th style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0.5px 1px; text-align: center; font-size: 4.5pt; font-weight: bold;">TIME</th>
            <th style="border-bottom: 1px solid #000; padding: 0.5px 1px; text-align: center; font-size: 4.5pt; font-weight: bold;">INT</th>
          </tr>
        </thead>
        <tbody>
          ${cat.medications.flatMap((med, medIdx) => {
            const scheduleStr = (med.schedule || '').toLowerCase();
            const hasAM = scheduleStr.includes('am') || scheduleStr.includes('morning');
            const hasPM = scheduleStr.includes('pm') || scheduleStr.includes('afternoon') || scheduleStr.includes('evening');
            const showBoth = hasAM && hasPM || (!hasAM && !hasPM); // if no schedule specified, show both
            
            return intakeDates.flatMap(date => {
              const rows = [];
              if (showBoth || hasAM) {
                rows.push(`<tr>
                  <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0.5px 1px; font-size: 5pt; line-height: 0.9;">${med.name}</td>
                  <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0.5px 1px; text-align: center; font-size: 5pt; line-height: 0.9;">${formatShortDate(date)} AM</td>
                  <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0.5px 1px; text-align: center; width: 0.25in; line-height: 0.9;"></td>
                  <td style="border-bottom: 1px solid #000; padding: 0.5px 1px; text-align: center; width: 0.15in; line-height: 0.9;"></td>
                </tr>`);
              }
              if (showBoth || hasPM) {
                rows.push(`<tr>
                  <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0.5px 1px; font-size: 5pt; line-height: 0.9;">${med.name}</td>
                  <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0.5px 1px; text-align: center; font-size: 5pt; line-height: 0.9;">${formatShortDate(date)} PM</td>
                  <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0.5px 1px; text-align: center; width: 0.25in; line-height: 0.9;"></td>
                  <td style="border-bottom: 1px solid #000; padding: 0.5px 1px; text-align: center; width: 0.15in; line-height: 0.9;"></td>
                </tr>`);
              }
              return rows;
            });
          }).join('')}
        </tbody>
      </table>` : '<div style="font-size: 5pt; color: #999;">_________________</div>';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0.5in; background: white; }
          .card { width: 6in; height: 4in; padding: 0.12in; border: 2px solid #000; font-family: Arial, sans-serif; font-size: 6pt; display: flex; flex-direction: column; page-break-after: always; }
        </style>
      </head>
      <body>
        <div class="card">
          <!-- TOP SECTION: Cat Info -->
          <div style="margin-bottom: 0.06in; font-size: 6pt; line-height: 1;">
            <div style="display: flex; gap: 0.2in; margin-bottom: 0.03in;">
              <div style="flex: 1;">
                <span style="font-weight: bold; font-size: 5.5pt;">KENNEL#:</span>
                <span style="border-bottom: 1px solid #000; display: inline-block; width: 0.6in; margin-left: 0.02in; font-size: 6pt;">${cat.kennel || 'TBD'}</span>
                <span style="margin-left: 0.15in; font-weight: bold; font-size: 5.5pt;">M/F:</span>
                <span style="border-bottom: 1px solid #000; display: inline-block; width: 0.4in; margin-left: 0.02in; font-size: 6pt;">${cat.sex || ''}</span>
              </div>
            </div>

            <div style="display: flex; gap: 0.15in; margin-bottom: 0.03in; font-size: 5.5pt;">
              <div style="flex: 1.2;">
                <span style="font-weight: bold;">NAME:</span>
                <span style="border-bottom: 1px solid #000; display: inline-block; width: 0.8in; margin-left: 0.02in; font-size: 5.5pt;">${cat.name}</span>
              </div>
              <div style="flex: 1.5;">
                <span style="font-weight: bold;">DESC:</span>
                <span style="border-bottom: 1px solid #000; display: inline-block; width: 0.8in; margin-left: 0.02in; font-size: 5pt;">${cat.desc || ''}</span>
              </div>
            </div>

            <div style="display: flex; gap: 0.15in; font-size: 5.5pt;">
              <div style="flex: 0.8;">
                <span style="font-weight: bold;">AGE:</span>
                <span style="border-bottom: 1px solid #000; display: inline-block; width: 0.6in; margin-left: 0.02in; font-size: 5.5pt;">${convertAge(cat.age)}</span>
              </div>
              <div style="flex: 1;">
                <span style="font-weight: bold;">MICROCHIP#:</span>
                <span style="border-bottom: 1px solid #000; display: inline-block; width: 0.7in; margin-left: 0.02in; font-size: 5pt;">${cat.microchip_number || ''}</span>
              </div>
              <div style="flex: 0.9;">
                <span style="font-weight: bold;">NEUTER/SPAY:</span>
                <span style="border-bottom: 1px solid #000; display: inline-block; width: 0.5in; margin-left: 0.02in; font-size: 5pt;">${cat.neutered_spayed || ''}</span>
              </div>
            </div>
          </div>

          <!-- TWO COLUMN SECTION -->
          <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 0.08in; flex: 1; overflow: hidden; font-size: 5pt;">
            
            <!-- LEFT COLUMN: Daily Care Log -->
            <div style="display: flex; flex-direction: column; border: 1px solid #000; padding: 0.02in;">
              <div style="font-weight: bold; font-size: 5.5pt; border-bottom: 1px solid #000; padding: 0.01in 0.02in; text-align: center; background: #f0f0f0; line-height: 1;">DAILY CARE LOG</div>
              <table style="width: 100%; border-collapse: collapse; font-size: 5pt; flex: 1;">
                <thead>
                  <tr>
                    <th style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0.5px 1px; text-align: center; font-weight: bold; font-size: 4.5pt; line-height: 0.9;">DATE</th>
                    <th style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 0.5px 1px; text-align: center; font-weight: bold; font-size: 4.5pt; line-height: 0.9;">AM/PM</th>
                    <th style="border-bottom: 1px solid #000; padding: 0.5px 1px; text-align: center; font-weight: bold; font-size: 4.5pt; line-height: 0.9;">INT</th>
                  </tr>
                </thead>
                <tbody>
                  ${careLogHTML}
                </tbody>
              </table>
            </div>

            <!-- RIGHT COLUMN: Meds & Notes -->
            <div style="display: flex; flex-direction: column; gap: 0.04in;">
              <!-- MEDS Section -->
              <div style="border: 1px solid #000; padding: 0.02in; flex: 1; overflow-y: auto;">
                <div style="font-weight: bold; font-size: 5.5pt; border-bottom: 1px solid #000; margin-bottom: 0.02in; padding-bottom: 0.01in; background: #f0f0f0; line-height: 1;">MEDS</div>
                <div style="font-size: 5.5pt;">
                  ${medsHTML}
                </div>
              </div>

              <!-- NOTES Section -->
              <div style="border: 1px solid #000; padding: 0.02in; flex: 0.6; overflow: hidden;">
                <div style="font-weight: bold; font-size: 5.5pt; border-bottom: 1px solid #000; margin-bottom: 0.01in; padding-bottom: 0.01in; background: #f0f0f0; line-height: 1;">NOTES:</div>
                <div style="font-size: 5pt; height: 100%; overflow: hidden; white-space: pre-wrap; word-break: break-word; line-height: 1.1;">
                  ${data.notes}
                </div>
              </div>
            </div>

          </div>
        </div>
      </body>
      </html>
    `;
  };

  if (!data || quarantineCats.length === 0) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <h1>Quarantine Cards</h1>
        <p>No cats in quarantine</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: white; }
        }
      `}</style>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: '600', color: '#2c3e50' }}>
          Quarantine Cards
        </h1>
        <p style={{ margin: '0', color: '#888', fontSize: '1rem' }}>
          Add notes if needed, then print each cat's card
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {quarantineCats.map(cat => {
          const isExpanded = expandedCat === cat.id;
          const catCardData = cardData[cat.id];

          if (isExpanded && !catCardData) {
            initializeCatData(cat);
          }

          return (
            <div key={cat.id} style={{
              background: 'white',
              border: '1px solid #d4d1cc',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {/* Header */}
              <button
                onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: isExpanded ? '#f5f4f0' : 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => !isExpanded && (e.currentTarget.style.background = '#f5f4f0')}
                onMouseOut={(e) => !isExpanded && (e.currentTarget.style.background = 'white')}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0', color: '#2c3e50' }}>
                    {cat.name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#888', margin: '0.25rem 0 0 0' }}>
                    Kennel {cat.kennel || 'TBD'} • {cat.age || '?'} • {cat.sex} 
                    {cat.medications && cat.medications.length > 0 && ` • ${cat.medications.length} med${cat.medications.length > 1 ? 's' : ''}`}
                  </div>
                </div>
                <ChevronDown
                  size={20}
                  style={{
                    color: '#999',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                />
              </button>

              {/* Expanded Content */}
              {isExpanded && catCardData && (
                <div style={{
                  padding: '1.5rem',
                  background: '#f5f4f0',
                  borderTop: '1px solid #d4d1cc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem'
                }}>
                  {/* MEDICATIONS INFO */}
                  {cat.medications && cat.medications.length > 0 && (
                    <div style={{ background: 'white', padding: '1rem', borderRadius: '6px' }}>
                      <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#2c3e50' }}>
                        MEDICATIONS ({cat.medications.length})
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {cat.medications.map((med, idx) => (
                          <div key={idx} style={{ padding: '0.5rem', background: '#f5f4f0', borderRadius: '4px', fontSize: '0.9rem' }}>
                            <strong>{med.name}</strong> {med.dosage && `— ${med.dosage}`}
                          </div>
                        ))}
                      </div>
                      <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>
                        ✓ Auto-loaded from database
                      </p>
                    </div>
                  )}

                  {/* NOTES SECTION */}
                  <div style={{ background: 'white', padding: '1rem', borderRadius: '6px' }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#2c3e50' }}>
                      NOTES (Optional)
                    </h3>
                    <textarea
                      value={catCardData.notes || ''}
                      onChange={(e) => handleCardDataChange(cat.id, 'notes', e.target.value)}
                      placeholder="Add any special notes for this cat..."
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '0.65rem',
                        border: '1px solid #d4d1cc',
                        borderRadius: '6px',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* PRINT BUTTON */}
                  <button
                    onClick={() => handlePrint(cat.id)}
                    style={{
                      padding: '0.85rem 1.25rem',
                      background: '#d97706',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#b45309'}
                    onMouseOut={(e) => e.target.style.background = '#d97706'}
                  >
                    <Printer size={18} />
                    Print {cat.name}'s Card
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
