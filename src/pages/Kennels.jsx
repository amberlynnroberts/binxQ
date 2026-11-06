import React from 'react';
import { ChevronRight, Plus, Search, Pencil, Check, X, Trash2, Syringe } from 'lucide-react';
import { AnimalThumb } from '../components/AnimalPhoto';
import { Empty, kennelShort } from '../components/ui';
import { getAnimalFilterCounts } from '../lib/animalFilters';
import { useEffect, useState } from 'react';
import { fetchCleaningSignoffsForDate } from '../lib/dailyCareStatusApi';
import { todayDateString } from '../lib/careTaskRules';
import { formatAge } from '../lib/formatAge';
import { getKennelColorClass } from '../lib/kennelColors.js';
import { updateAnimalKennelNumber, clearAnimalKennelNumber, toggleAnimalVetDay } from '../lib/kennelUpdateApi';
import { updateQuarantineAnimal } from '../lib/api';

function KennelEdit({ animal, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(animal.kennel ?? '');
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');

  const hasKennel = Boolean(animal.kennel && animal.kennel !== '?');

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

  async function clear(e) {
    e.stopPropagation();
    if (!window.confirm(`Clear ${animal.name}'s kennel assignment?`)) return;
    setClearing(true);
    setError('');
    try {
      await clearAnimalKennelNumber({
        animalId: animal.id,
        shelterluvId: animal.shelterluv_id,
      });
      onSaved?.();
      setEditing(false);
      setValue('');
    } catch (err) {
      setError(err.message);
    } finally {
      setClearing(false);
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
      <div className="inlineEdit" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') save(e);
            if (e.key === 'Escape') cancel(e);
          }}
          placeholder="Kennel #"
        />
        <button onClick={save} disabled={saving} className="chipButton accent">
          {saving ? 'Saving…' : <><Check size={15} /> Save</>}
        </button>
        {hasKennel && (
          <button onClick={clear} disabled={clearing} title="Clear kennel" aria-label="Clear kennel" className="chipButton danger iconOnly">
            {clearing ? '…' : <Trash2 size={14} />}
          </button>
        )}
        <button onClick={cancel} className="chipButton muted iconOnly" aria-label="Cancel">
          <X size={15} />
        </button>
        {error && <small>{error}</small>}
      </div>
    );
  }

  return (
    <>
      <button
        className={hasKennel ? 'chipButton' : 'chipButton muted'}
        onClick={e => { e.stopPropagation(); setEditing(true); setValue(animal.kennel ?? ''); }}
        title="Edit kennel"
      >
        <Pencil size={13} />
        {hasKennel ? `Kennel ${kennelShort(animal.kennel)}` : 'Set kennel'}
      </button>

      {hasKennel && (
        <button
          className="chipButton danger iconOnly"
          onClick={clear}
          disabled={clearing}
          title="Clear kennel assignment"
          aria-label="Clear kennel assignment"
        >
          {clearing ? '…' : <Trash2 size={14} />}
        </button>
      )}
    </>
  );
}

function MoveToQuarantineButton({ animal, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(e) {
    e.stopPropagation();
    if (!value.trim()) {
      setError('Kennel number is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateQuarantineAnimal(animal.id, animal.shelterluv_id, {
        kennel_number: value.trim(),
        local_status: 'Quarantine',
      });
      onSaved?.();
      setEditing(false);
      setValue('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function cancel(e) {
    e.stopPropagation();
    setValue('');
    setError('');
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="inlineEdit" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') save(e);
            if (e.key === 'Escape') cancel(e);
          }}
          placeholder="Kennel #"
        />
        <button onClick={save} disabled={saving} className="chipButton accent">
          {saving ? 'Saving…' : <><Check size={15} /> Save</>}
        </button>
        <button onClick={cancel} className="chipButton muted iconOnly" aria-label="Cancel">
          <X size={15} />
        </button>
        {error && <small>{error}</small>}
      </div>
    );
  }

  return (
    <button
      className="chipButton on"
      onClick={e => { e.stopPropagation(); setEditing(true); }}
      title="Move to quarantine"
    >
      Move to quarantine
    </button>
  );
}

// New: toggle button for flagging a foster cat as needing its weekly vet day.
// Mirrors the styling/interaction pattern of MoveToQuarantineButton above,
// but is a simple boolean flip rather than a form (no kennel number needed).
function VetDayToggle({ animal, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const needsVetDay = Boolean(animal.needs_vet_day);

  async function toggle(e) {
    e.stopPropagation();
    setSaving(true);
    setError('');
    try {
      await toggleAnimalVetDay({
        animalId: animal.id,
        shelterluvId: animal.shelterluv_id,
        needsVetDay: !needsVetDay,
      });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        className={needsVetDay ? 'chipButton on' : 'chipButton muted'}
        onClick={toggle}
        disabled={saving}
        title={needsVetDay ? 'Remove vet day flag' : 'Mark needs vet day'}
      >
        <Syringe size={13} />
        {saving ? 'Saving…' : needsVetDay ? 'Vet day: yes' : 'Add to vet day'}
      </button>
      {error && <small style={{ color: 'var(--rose)' }}>{error}</small>}
    </>
  );
}

function statusLabel(animal, animalView) {
  if (animalView === 'quarantine') {
    return animal.kennel && animal.kennel !== '?' ? `Kennel ${animal.kennel.replace(/\D/g, '') || animal.kennel}` : 'No kennel assigned';
  }
  if (animalView === 'rescue') return 'Cat Lounge';
  if (animalView === 'foster') {
    // Foster cats don't normally have a kennel, but staff can assign one
    // temporarily (e.g. an overnight stay after surgery). Show it if set.
    return animal.kennel && animal.kennel !== '?'
      ? `Kennel ${animal.kennel.replace(/\D/g, '') || animal.kennel} (overnight)`
      : 'In foster — no kennel assigned';
  }
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
  // PERFORMANCE FIX: this page previously did its own full data fetch on
  // every mount (a duplicate of the app-wide fetch App.jsx already does),
  // which caused noticeable lag switching to this tab and could fail
  // silently on a network hiccup, leaving the page empty until a manual
  // refresh. Now that api.js's fetchKennelCheckData always returns every
  // animal (including archived) in the one shared app-wide fetch, this
  // page just uses the `data`/`allAnimals` props directly — no separate
  // fetch needed. `data.animals` is already correctly filtered by
  // animalView (App.jsx does this once for everyone), and `allAnimals` is
  // the full unfiltered list used for the tab count badges.
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

  // Kennel assignment/clearing is available in Quarantine and Foster (as
  // before), and now Archived too — so staff can clear a stale kennel
  // number left over from before a cat was adopted/placed, without
  // needing direct database access.
  const showKennelEdit = animalView === 'quarantine' || animalView === 'foster' || animalView === 'archived';

  // "Move to Quarantine" is for Rescue/Lounge and Archived cats (e.g. a
  // "Healthy in Home" cat that's being returned). Foster cats already work
  // via the existing kennel-assignment logic (assigning any kennel number
  // makes a Foster cat count as quarantine automatically — only Lounge is
  // hard-excluded regardless of kennel, per isQuarantineAnimal).
  const showMoveToQuarantine = animalView === 'rescue' || animalView === 'archived';

  // New: the vet-day toggle is only relevant for cats currently in foster,
  // since that's the group the weekly Thursday vet day reminder targets.
  const showVetDayToggle = animalView === 'foster';

  return (
    <main>
      <div className="screenTitle title">
        <h1>Cats</h1>
        <button className="primary" onClick={add}><Plus size={18} /> Add cat</button>
      </div>

      <section className="animalFilterPanel">
        <FilterButton value="quarantine" label="Quarantine" count={counts.quarantine} />
        <FilterButton value="rescue" label="Cat Lounge" count={counts.rescue} />
        <FilterButton value="foster" label="Foster" count={counts.foster} />
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
        {animalView === 'quarantine' && null}
        {animalView === 'rescue' && null}
        {animalView === 'foster' && 'Set a kennel if a foster cat is staying overnight, or flag it for Thursday vet day.'}
        {animalView === 'archived' && 'Adopted, transferred, deceased, or returned cats.'}
      </div>

      <div className="list">
        {list.length === 0 && (
          <Empty text={
            animalView === 'archived'
              ? 'No archived animals found.'
              : animalView === 'rescue'
                ? 'No active rescue animals found.'
                : animalView === 'foster'
                  ? 'No cats currently in foster.'
                  : 'No quarantine animals found.'
          } />
        )}

        {list.map(a => (
          <div
            className="catRow"
            key={a.id}
            role="button"
            tabIndex={0}
            onClick={() => select(a.id)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                select(a.id);
              }
            }}
          >
            <div className="catRowMain">
              {animalView === 'quarantine' && (
                <span className={`kennel ${getKennelColorClass(a.kennel)}`}>
                  {kennelShort(a.kennel)}
                </span>
              )}
              <AnimalThumb animal={a} />
              <span className="catRowInfo">
                <b>{a.name}</b>
                <small>{[a.sex, formatAge(a.age), a.desc].filter(v => v && v !== 'Unknown').join(', ')}</small>
                {animalView !== 'quarantine' && <small>{statusLabel(a, animalView)}</small>}
              </span>
              <ChevronRight size={18} />
            </div>

            <div className="catRowActions" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
              {showKennelEdit && <KennelEdit animal={a} onSaved={onAnimalUpdated} />}
              {showMoveToQuarantine && <MoveToQuarantineButton animal={a} onSaved={onAnimalUpdated} />}
              {showVetDayToggle && <VetDayToggle animal={a} onSaved={onAnimalUpdated} />}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}