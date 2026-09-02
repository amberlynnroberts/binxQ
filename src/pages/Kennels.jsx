import React from 'react';
import { ArrowLeft, ChevronRight, Plus, Search, Pencil, Check, X, Trash2, Syringe } from 'lucide-react';
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
        {hasKennel && (
          <button onClick={clear} disabled={clearing} title="Clear kennel" style={{ color: '#ff8a8a', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {clearing ? '…' : <Trash2 size={14} />}
          </button>
        )}
        <button onClick={cancel} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <X size={15} />
        </button>
        {error && <small style={{ color: '#ff4d4f', fontSize: 11 }}>{error}</small>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        onClick={e => { e.stopPropagation(); setEditing(true); setValue(animal.kennel ?? ''); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(148,163,184,0.18)',
          borderRadius: 8, padding: '5px 10px',
          cursor: 'pointer', fontSize: 12,
          color: hasKennel ? '#cbd5e1' : '#64748b',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
        title="Edit kennel"
      >
        <Pencil size={11} />
        {hasKennel ? animal.kennel : 'Set kennel'}
      </button>

      {hasKennel && (
        <button
          onClick={clear}
          disabled={clearing}
          title="Clear kennel assignment"
          style={{
            display: 'flex', alignItems: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#ff8a8a', flexShrink: 0, padding: '5px',
          }}
        >
          {clearing ? '…' : <Trash2 size={14} />}
        </button>
      )}
    </div>
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
      onClick={e => { e.stopPropagation(); setEditing(true); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(168,85,247,0.14)',
        border: '1px solid rgba(168,85,247,0.32)',
        borderRadius: 8, padding: '5px 10px',
        cursor: 'pointer', fontSize: 12,
        color: '#d8b4fe',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
      title="Move to Quarantine"
    >
      Move to Quarantine
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <button
        onClick={toggle}
        disabled={saving}
        title={needsVetDay ? 'Remove vet day flag' : 'Mark needs vet day'}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: needsVetDay ? 'rgba(56,189,248,0.16)' : 'rgba(255,255,255,0.06)',
          border: needsVetDay ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(148,163,184,0.18)',
          borderRadius: 8, padding: '5px 10px',
          cursor: 'pointer', fontSize: 12,
          color: needsVetDay ? '#7dd3fc' : '#64748b',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <Syringe size={12} />
        {saving ? '…' : needsVetDay ? 'Needs Vet Day' : 'Mark Vet Day'}
      </button>
      {error && <small style={{ color: '#ff4d4f', fontSize: 11 }}>{error}</small>}
    </div>
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
        <FilterButton value="foster" label="In Foster" count={counts.foster} />
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
        {animalView === 'foster' && 'Showing cats currently in foster. Assign a kennel below if one needs to stay overnight (e.g. post-surgery), or mark a cat as needing its weekly vet day.'}
        {animalView === 'archived' && 'Showing archived animals such as adopted, transferred, deceased, or returned.'}
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
            className="row"
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
            style={{ width: '100%', cursor: 'pointer' }}
          >
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

            {showKennelEdit && (
              <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                <KennelEdit animal={a} onSaved={onAnimalUpdated} />
              </div>
            )}

            {showMoveToQuarantine && (
              <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                <MoveToQuarantineButton animal={a} onSaved={onAnimalUpdated} />
              </div>
            )}

            {showVetDayToggle && (
              <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                <VetDayToggle animal={a} onSaved={onAnimalUpdated} />
              </div>
            )}

            <ChevronRight size={18} style={{ color: 'var(--round-muted)', flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </main>
  );
}