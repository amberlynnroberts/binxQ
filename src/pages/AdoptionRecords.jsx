// pages/AdoptionRecords.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { SearchableSelect } from '../components/SearchableSelect';
import { AdoptionRecordButton } from '../components/AdoptionRecordButton';
import { fetchKennelCheckData } from '../lib/api';

export function AdoptionRecords({ setPage }) {
  const [allAnimals, setAllAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    fetchKennelCheckData({ includeRemoved: true })
      .then(result => setAllAnimals(result.animals || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const sortedAnimals = useMemo(() => {
    return [...allAnimals].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [allAnimals]);

  const selectedAnimal = sortedAnimals.find(a => a.id === selectedId) || null;

  return (
    <main>
      <div className="roundsTop">
        <button type="button" className="roundsClose" onClick={() => setPage('more')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Adoption Records</h1>
        <span />
      </div>

      <section className="panel" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <FileText size={22} />
          <div>
            <b>Generate a vet record PDF</b>
            <p style={{ margin: '2px 0 0', color: 'var(--round-muted)', fontSize: 13 }}>
              Select any cat to download their full veterinary history — vaccines,
              appointments, surgeries, and follow-ups — for the adopter's records.
            </p>
          </div>
        </div>

        <label className="wide" style={{ display: 'grid', gap: 7, marginBottom: 16 }}>
          Cat
          <SearchableSelect
            value={selectedId}
            onChange={setSelectedId}
            options={sortedAnimals}
            getLabel={(animal) => animal.name}
            getValue={(animal) => animal.id}
            placeholder={loading ? 'Loading cats...' : 'Select cat...'}
          />
        </label>

        {selectedAnimal && (
          <AdoptionRecordButton
            animal={selectedAnimal}
            label={`Download ${selectedAnimal.name}'s Vet Record (PDF)`}
          />
        )}
      </section>
    </main>
  );
}
