import React from 'react';
import { ArrowLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { AnimalThumb } from '../components/AnimalPhoto';
import { Empty, kennelShort } from '../components/ui';
import { getAnimalFilterCounts } from '../lib/animalFilters';
import { useEffect, useState } from 'react';
import { fetchCleaningSignoffsForDate } from '../lib/dailyCareStatusApi';
import { animalHasEndOfDayCleaningWarning, todayDateString } from '../lib/careTaskRules';
import { formatAge} from '../lib/formatAge';
import { getKennelColorClass} from '../lib/kennelColors.js';

export function Kennels({
  data,
  allAnimals = data.animals,
  query,
  setQuery,
  select,
  add,
  animalView = 'quarantine',
  setAnimalView
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
          <ArrowLeft size={20}/>
        </button>
        <h1>Kennels</h1>
        <span/>
      </div>
      <div className="title">
        <h1>Cats</h1>
        <button className="primary" onClick={add}><Plus size={18}/> Add</button>
      </div>

      <section className="animalFilterPanel">
        <FilterButton value="quarantine" label="Quarantine Only" count={counts.quarantine} />
        <FilterButton value="rescue" label="In Rescue" count={counts.rescue} />
        <FilterButton value="archived" label="Archived" count={counts.archived} />
      </section>

      <label className="search">
        <Search size={16}/>
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
          <button className="row" key={a.id} onClick={() => select(a.id)}>
        {animalView === 'quarantine' && (
          <span className={`kennel ${getKennelColorClass(a.kennel)}`}>
            {kennelShort(a.kennel)}
          </span>
        )}    
            <AnimalThumb animal={a}/>
            <span>
              <b>
                {a.name}
              </b>
              <small>{a.desc} • {a.sex} • {formatAge(a.age )}</small>
              <small> {a.shelterluv_status}</small>
            </span>
            
            <ChevronRight/>
          </button>
        ))}
      </div>
    </main>
  );
}
