import React from 'react';
import { ArrowLeft, ChevronRight, Plus, Search, Pencil, Check, X } from 'lucide-react';
import { AnimalThumb } from '../components/AnimalPhoto';
import { Empty, kennelShort } from '../components/ui';
import { getAnimalFilterCounts } from '../lib/animalFilters';
import { useEffect, useState } from 'react';
import { fetchCleaningSignoffsForDate } from '../lib/dailyCareStatusApi';
import { todayDateString } from '../lib/careTaskRules';
import { formatAge } from '../lib/formatAge';
import { getKennelColorClass } from '../lib/kennelColors.js';
import { updateAnimalKennelNumber } from '../lib/kennelUpdateApi';

function KennelEdit({ animal, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(animal.kennel ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(e) {
    e.stopPropagation();
    if (!value.trim()) return;
    setSaving(true);
    setError('');
    try {
      await updateAnimalKennelNumber({
        animalId: animal.id,
        shelterluvId: animal.shelterluv_id,
        kennelNumber: value.trim(),
      });
      onSaved?.();
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function cancel(e) {
    e.stopPropagation();
    setValue(animal.kennel ?? '');
    setError('');
    setEditing(false);
  }

  if (editing) {
    return (
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') save(e);
            if (e.key === 'Escape') cancel(e);
          }}
          placeholder="Kennel #"
          style={{ width: 72, fontSize: 13, padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15,23,42,0.95)', color: 'white' }}
        />
        <button onClick={save} disabled={saving} style={{ color: '#39d353', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          {saving ? '…' : <Check size={15} />}
        </button>
        <button onClick={cancel} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <X size={15} />
        </button>
        {error && <small style={{ color: '#ff4d4f', fontSize: 11 }}>{error}</small>}
      </div>
    );
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setEditing(true); setValue(animal.kennel ?? ''); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(148,163,184,0.18)',
        borderRadius: 8, padding: '5px 10px',
        cursor: 'pointer', fontSize: 12,
        color: animal.kennel && animal.kennel !== '?' ? '#cbd5e1' : '#64748b',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
      title="Edit kennel"
    >
      <Pencil size={11} />
      {animal.kennel && animal.kennel !== '?' ? animal.kennel : 'Set kennel'}
    </button>
  );
}

function statusLabel(animal, animalView) {
  if (animalView === 'quarantine') {
    return animal.kennel && animal.kennel !== '?' ? `Kennel ${animal.kennel.replace(/\D/g, '') || animal.kennel}` : 'No kennel assigned';
  }
  if (animalView === 'rescue') return 'Cat Lounge';
  // archived — show a cleaner status
  const s = String(animal.shelterluv_status || animal.status || '').trim();
  if (!s) return '';
  // shorten common long statuses
  if (s.toLowerCase().includes('healthy in home')) return 'Adopted / In Home';
  if (s.toLowerCase().includes('transferred')) return 'Transferred';
  if (s.toLowerCase() === 'deceased') return 'Deceased';
  if (s.toLowerCase().includes('released')) return 'Released';
  return s.length > 30 ? s.slice(0, 30) + '…' : s;
}

export function Kennels({
  data,
  allAnimals = data.animals,
  query,
  setQuery,
  select,
  add,
  animalView = 'quarantine',
  setAnimalView,
  onAnimalUpdated,
}) {
  const counts = getAnimalFilterCounts(allAnimals);

  const list = data.animals.filter(a =>
    `${a.name} ${a.kennel} ${a.status} ${a.shelterluv_status || ''} ${a.desc}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const [cleaningSignoffs, setCleaningSignoffs] = useState([]);
  useEffect(() => {
    fetchCleaningSignoffsForDate(todayDateString())
      .then(setCleaningSignoffs)
      .catch(console.error);
  }, [data.animals.length]);

  function FilterButton({ value, label, count }) {
    const active = animalView === value;
    return (
      <button
        type="button"
        className={active ? 'filterChip active' : 'filterChip'}
        onClick={() => setAnimalView?.(value)}
      >
        <span>{label}</span>
        <b>{count}</b>
      </button>
    );
  }

  return (
    <main>
      <div className="roundsTop">
        <button type="button" className="roundsClose" onClick={() => window.history.back()}>
          <ArrowLeft size={20} />
        </button>
        <h1>Kennels</h1>
        <span />
      </div>
      <div className="title">
        <h1>Cats</h1>
        <button className="primary" onClick={add}><Plus size={18} /> Add</button>
      </div>

      <section className="animalFilterPanel">
        <FilterButton value="quarantine" label="Quarantine Only" count={counts.quarantine} />
        <FilterButton value="rescue" label="In Rescue" count={counts.rescue} />
        <FilterButton value="archived" label="Archived" count={counts.archived} />
      </section>

      <label className="search">
        <Search size={16} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search cats, kennels, status..."
        />
      </label>

      <div className="viewHelper">
        {animalView === 'quarantine' && 'Showing only active quarantine animals.'}
        {animalView === 'rescue' && 'Showing active animals currently in the rescue.'}
        {animalView === 'archived' && 'Showing archived animals such as adopted, transferred, deceased, or returned.'}
      </div>

      <div className="list">
        {list.length === 0 && (
          <Empty text={
            animalView === 'archived'
              ? 'No archived animals found.'
              : animalView === 'rescue'
                ? 'No active rescue animals found.'
                : 'No quarantine animals found.'
          } />
        )}

        {list.map(a => (
          <button className="row" key={a.id} onClick={() => select(a.id)} style={{ width: '100%' }}>
            {animalView === 'quarantine' && (
              <span className={`kennel ${getKennelColorClass(a.kennel)}`}>
                {kennelShort(a.kennel)}
              </span>
            )}

            <AnimalThumb animal={a} />

            <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.name}
              </b>
              <small style={{ display: 'block', color: 'var(--round-muted)' }}>
                {a.desc} • {a.sex} • {formatAge(a.age)}
              </small>
              <small style={{ display: 'block', color: 'var(--round-muted)', marginTop: 2 }}>
                {statusLabel(a, animalView)}
              </small>
            </span>

            {animalView === 'quarantine' && (
              <div onClick={e => e.stopPropagation()}>
                <KennelEdit animal={a} onSaved={onAnimalUpdated} />
              </div>
            )}

            <ChevronRight size={18} style={{ color: 'var(--round-muted)', flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </main>
  );
}
