import React from 'react';
import { ArrowLeft, ChevronRight, Plus, Search, Pencil, Check, X } from 'lucide-react';
import { AnimalThumb } from '../components/AnimalPhoto';
import { Empty, kennelShort } from '../components/ui';
import { getAnimalFilterCounts } from '../lib/animalFilters';
import { useEffect, useState } from 'react';
import { fetchCleaningSignoffsForDate } from '../lib/dailyCareStatusApi';
import { animalHasEndOfDayCleaningWarning, todayDateString } from '../lib/careTaskRules';
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
    setValue(animal.kennel_number ?? '');
    setError('');
    setEditing(false);
  }

  if (editing) {
    return (
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') save(e);
            if (e.key === 'Escape') cancel(e);
          }}
          placeholder="Kennel #"
          style={{ width: 80, fontSize: 13, padding: '2px 6px', borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button
          onClick={save}
          disabled={saving}
          style={{ color: '#1D9E75', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {saving ? '…' : <Check size={14} />}
        </button>
        <button
          onClick={cancel}
          style={{ color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <X size={14} />
        </button>
        {error && <small style={{ color: 'red' }}>{error}</small>}
      </div>
    );
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setEditing(true); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: '#f0f0f0', border: '1px solid #ddd',
        borderRadius: 6, padding: '3px 8px',
        cursor: 'pointer', fontSize: 12, color: '#444',
        marginRight: 8
      }}
      title="Edit kennel"
    >
      <Pencil size={12} />
      {animal.kennel_number ?? 'Set kennel'}
    </button>
  );
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
    `${a.name} ${a.kennel_number} ${a.status} ${a.shelterluv_status || ''} ${a.desc}`
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
          <div className="row" key={a.id} style={{ display: 'flex', alignItems: 'center' }}>
            {animalView === 'quarantine' && (
              <span className={`kennel ${getKennelColorClass(a.kennel_number)}`}>
                {kennelShort(a.kennel_number)}
              </span>
            )}
            <button
              style={{ display: 'flex', alignItems: 'center', flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => select(a.id)}
            >
              <AnimalThumb animal={a} />
              <span style={{ flex: 1, textAlign: 'left' }}>
                <b>{a.name}</b>
                <small>{a.desc} • {a.sex} • {formatAge(a.age)}</small>
                <small>{a.shelterluv_status}</small>
              </span>
            </button>
            <div onClick={e => e.stopPropagation()} style={{ marginRight: 4 }}>
              <KennelEdit animal={a} onSaved={onAnimalUpdated} />
            </div>
            <ChevronRight size={18} style={{ color: '#ccc', flexShrink: 0 }} onClick={() => select(a.id)} />
          </div>
        ))}
      </div>
    </main>
  );
}