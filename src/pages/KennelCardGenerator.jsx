// pages/KennelCardGenerator.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { SearchableSelect } from '../components/SearchableSelect';
import { fetchKennelCheckData } from '../lib/api';
import { formatAge } from '../lib/formatAge';
import { BINX_LOGO_BASE64 } from '../lib/logoData';

export function KennelCardGenerator({ setPage }) {
  const [allAnimals, setAllAnimals] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [foodOptions, setFoodOptions] = useState({ Adult: false, Kitten: false, Wet: false, Dry: false });
  const [foodOther, setFoodOther] = useState('');
  const [additives, setAdditives] = useState('');
  const [notes, setNotes] = useState('');
  const [kennelOverride, setKennelOverride] = useState('');
  const [includePhoto, setIncludePhoto] = useState(true);
  const [orientation, setOrientation] = useState('portrait');

  useEffect(() => {
    fetchKennelCheckData({ includeRemoved: true })
      .then(result => setAllAnimals(result.animals || []))
      .catch(console.error);
  }, []);

  const sortedAnimals = useMemo(() => {
    return [...allAnimals].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [allAnimals]);

  const animal = sortedAnimals.find(a => a.id === selectedId);

  // Pre-fill kennel number from the animal's current assignment, if any,
  // but keep it editable — staff may be printing this card for a kennel
  // the cat is about to move into, not the one they're currently in.
  useEffect(() => {
    if (animal) {
      setKennelOverride(animal.kennel && animal.kennel !== '?' ? animal.kennel : '');
    }
  }, [animal?.id]);

  function toggleFoodOption(key) {
    setFoodOptions(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // Combines whichever food checkboxes are checked plus any free-typed
  // "Other" text into a single display string. If nothing is checked and
  // nothing is typed, this is an empty string — the card shows blank
  // rather than a placeholder like "None selected".
  const foodTypeDisplay = useMemo(() => {
    const checked = Object.entries(foodOptions).filter(([, v]) => v).map(([k]) => k);
    const parts = [...checked, foodOther.trim()].filter(Boolean);
    return parts.join(', ');
  }, [foodOptions, foodOther]);

  function handlePrint() {
    window.print();
  }

  const alteredText = animal?.altered === true ? 'Yes' : animal?.altered === false ? 'No' : 'Unknown';
  const photoUrl = animal?.photo && String(animal.photo).startsWith('http') ? animal.photo : BINX_LOGO_BASE64;

  return (
    <main>
      <div className="roundsTop noPrint">
        <button type="button" className="roundsClose" onClick={() => setPage('more')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Kennel Card</h1>
        <span />
      </div>

      <form className="vetEventForm improved noPrint" onSubmit={e => e.preventDefault()} style={{ marginTop: 12 }}>
        <div className="vetFormHeader">
          <div>
            <h2>Kennel Card</h2>
            <small>NC-required front-of-kennel card: pick a cat, fill in what's not tracked automatically, and print.</small>
          </div>
        </div>

        <label className="wide">
          Cat
          <SearchableSelect
            value={selectedId}
            onChange={setSelectedId}
            options={sortedAnimals}
            getLabel={(a) => a.name}
            getValue={(a) => a.id}
            placeholder="Select cat..."
          />
        </label>

        {animal && (
          <>
            <label className="wide">
              Kennel Number
              <input
                value={kennelOverride}
                onChange={e => setKennelOverride(e.target.value)}
                placeholder="e.g. 5"
              />
            </label>

            <label className="wide">
              Food Type
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '4px 0 10px' }}>
                {['Adult', 'Kitten', 'Wet', 'Dry'].map(opt => (
                  <label
                    key={opt}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, color: 'var(--round-text)' }}
                  >
                    <input
                      type="checkbox"
                      checked={foodOptions[opt]}
                      onChange={() => toggleFoodOption(opt)}
                      style={{ width: 18, height: 18, accentColor: 'var(--round-green)' }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
              <input
                value={foodOther}
                onChange={e => setFoodOther(e.target.value)}
                placeholder="Other (optional)"
              />
            </label>

            <label className="wide">
              Additives
              <input
                value={additives}
                onChange={e => setAdditives(e.target.value)}
                placeholder="e.g. probiotic powder, fish oil, wet food topper"
              />
            </label>

            <label className="wide">
              Notes
              <textarea
                rows="3"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Special handling, medical notes, etc."
              />
            </label>

            <label
              className="wide"
              style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, color: 'var(--round-text)' }}
            >
              <input
                type="checkbox"
                checked={includePhoto}
                onChange={e => setIncludePhoto(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--round-green)' }}
              />
              Include photo on card
            </label>

            <div className="wide" style={{ display: 'grid', gap: 7 }}>
              <span style={{ fontWeight: 700, color: 'var(--round-text)' }}>Card Orientation</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className={orientation === 'portrait' ? 'roundPrimary' : 'roundSecondary'}
                  onClick={() => setOrientation('portrait')}
                  style={{ flex: 1 }}
                >
                  Portrait (4in x 6in)
                </button>
                <button
                  type="button"
                  className={orientation === 'landscape' ? 'roundPrimary' : 'roundSecondary'}
                  onClick={() => setOrientation('landscape')}
                  style={{ flex: 1 }}
                >
                  Landscape (6in x 4in)
                </button>
              </div>
              <small style={{ color: 'var(--round-muted)' }}>
                Match this to the Portrait/Landscape option in your printer's dialog when you print.
              </small>
            </div>

            <button type="button" className="roundPrimary wide" onClick={handlePrint}>
              <Printer size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Print Kennel Card
            </button>
          </>
        )}
      </form>

      {/* This block is hidden on screen (see .kennelCardPrintArea CSS) and
          only rendered visibly by the browser's print stylesheet, so the
          on-screen form above doesn't get printed along with it. */}
      {animal && (() => {
        const cardContent = (
          <>
            <h1 className="kennelCardName">{animal.name}</h1>

            <div className="kennelCardSubInfo">
              {[animal.primary_breed, animal.desc].filter(Boolean).join(', ') || '—'}
              {animal.microchip_number ? ` • Chip: ${animal.microchip_number}` : ''}
            </div>

            <div className="kennelCardKennelBadge">Kennel {kennelOverride || '—'}</div>

            {animal.medications && animal.medications.length > 0 && (
              <div className="kennelCardRow" style={{ borderTop: 'none', marginBottom: 8 }}>
                <b>Medications</b>
                <span>
                  {animal.medications.map(m => `${m.name}${m.dose ? ` (${m.dose})` : ''}${m.schedule ? ` – ${m.schedule}` : ''}`).join('; ')}
                </span>
              </div>
            )}

            <div className="kennelCardGrid">
              <div><b>Age</b><span>{formatAge(animal.age)}</span></div>
              <div><b>Sex</b><span>{animal.sex || 'Unknown'}</span></div>
              <div><b>Intake Date</b><span>{animal.intake || '—'}</span></div>
              <div><b>Spayed/Neutered</b><span>{alteredText}</span></div>
            </div>

            <div className="kennelCardRow">
              <b>Food Type</b>
              <span>{foodTypeDisplay}</span>
            </div>

            <div className="kennelCardRow">
              <b>Additives</b>
              <span>{additives || '—'}</span>
            </div>

            <div className="kennelCardNotesRow">
              <b>Notes</b>
              <span>{notes || '—'}</span>
            </div>
          </>
        );

        return (
          <div className="kennelCardPrintArea">
            <div className={`kennelCardSheet ${orientation}`}>
              {includePhoto && (
                <div className="kennelCardPhotoWrap">
                  <img src={photoUrl} alt={animal.name} className="kennelCardPhoto" />
                </div>
              )}

              {orientation === 'landscape'
                ? <div className="kennelCardMain">{cardContent}</div>
                : cardContent}
            </div>
          </div>
        );
      })()}
    </main>
  );
}
