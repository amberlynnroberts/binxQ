// components/AdoptionRecordButton.jsx
import React, { useState } from 'react';
import { FileDown } from 'lucide-react';
import { fetchVetEventsForAnimal } from '../lib/vetEventsApi';
import { generateAdoptionRecordPdf } from '../lib/adoptionRecordPdf';

export function AdoptionRecordButton({ animal, label = 'Download Vet Record (PDF)' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    if (!animal?.id) return;
    setError('');
    setBusy(true);
    try {
      const events = await fetchVetEventsForAnimal(animal.id);
      generateAdoptionRecordPdf(animal, events);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not generate PDF.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="roundPrimary"
        disabled={busy || !animal?.id}
        onClick={handleClick}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      >
        <FileDown size={18} />
        {busy ? 'Generating...' : label}
      </button>
      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
