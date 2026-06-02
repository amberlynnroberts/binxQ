import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, ClipboardCheck, Pill, Search } from 'lucide-react';
import { AnimalThumb } from '../components/AnimalPhoto';
import { fetchDailyCareSignoffs } from '../lib/dailyCareApi';
import { todayDateString } from '../lib/careTaskRules';
import { isQuarantineAnimal } from '../lib/animalFilters';
import { getCompletedIdsFromSignoffs, getCompletedMedicationKeys, getKennelProgress, groupAnimalsByKennel } from '../lib/roundBoardUtils';
import { getKennelColorClass } from '../lib/kennelColors';
import { kennelShort } from '../components/ui';
import { formatAge } from '../lib/formatAge';
import { medNeededForShift } from '../lib/medUtils';

function ProgressPill({ progress }) {
  if (progress.done) {
    return (
      <span className="roundBoardDone">
        <CheckCircle2 size={16}/>
        Done
      </span>
    );
  }
  return <span className="roundBoardPercent">{progress.percent}% complete</span>;
}

function CatStatusBadge({ done, roundType }) {
  if (done) {
    return (
      <span className="catDoneBadge">
        <CheckCircle2 size={15}/>
        Done
      </span>
    );
  }
  return (
    <span className={roundType === 'med' ? 'catDueBadge blue' : 'catDueBadge'}>
      {roundType === 'med' ? 'Med due' : 'Needs care'}
    </span>
  );
}

export function RoundKennels({
  data,
  roundType = 'care',
  shift = 'AM',
  setPage,
  setSelectedRoundAnimal,
  setSelectedRoundMedication
}) {
  const [signoffs, setSignoffs] = useState({ cleaning: [], medication: [] });
  const [query, setQuery] = useState('');

  const animals = useMemo(() => {
    return (data?.animals || []).filter(isQuarantineAnimal);
  }, [data]);

  const meds = data?.meds || [];

  useEffect(() => {
    fetchDailyCareSignoffs({ careDate: todayDateString(), shift })
      .then(rows => setSignoffs(rows))
      .catch(console.error);
  }, [animals.length, shift]);

  const completedCareIds = useMemo(() => {
    return getCompletedIdsFromSignoffs(signoffs.cleaning || [], shift);
  }, [signoffs, shift]);

  const completedMedKeys = useMemo(() => {
    return getCompletedMedicationKeys(signoffs.medication || [], shift);
  }, [signoffs, shift]);

  const medByAnimal = useMemo(() => {
    const map = new Map();
    for (const med of meds.filter(m => m.active && medNeededForShift(m, shift))) {
      const list = map.get(med.animalId) || [];
      list.push(med);
      map.set(med.animalId, list);
    }
    return map;
  }, [meds, shift]);

  const loungeAnimals = useMemo(() => {
    if (roundType !== 'med') return [];
    return (data?.animals || []).filter(a =>
      !isQuarantineAnimal(a) &&
      (medByAnimal.get(a.id) || []).length > 0
    );
  }, [data, roundType, medByAnimal]);

  const visibleAnimals = useMemo(() => {
    let list = animals;

    if (roundType === 'med') {
      list = list.filter(animal => {
        const activeMeds = medByAnimal.get(animal.id) || [];
        return activeMeds.some(med => !completedMedKeys.has(`${animal.id}:${med.id}`));
      });
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(animal =>
        `${animal.name} ${animal.kennel} ${animal.shelterluv_status} ${animal.status}`
          .toLowerCase()
          .includes(q)
      );
    }

    return list;
  }, [animals, roundType, medByAnimal, completedMedKeys, query]);

  const kennelGroups = useMemo(() => {
    return groupAnimalsByKennel(visibleAnimals);
  }, [visibleAnimals]);

  function openCat(animal) {
    const activeMeds = medByAnimal.get(animal.id) || [];
    setSelectedRoundAnimal?.(animal.id);
    if (roundType === 'med') {
      const nextMed = activeMeds.find(med => !completedMedKeys.has(`${animal.id}:${med.id}`));
      setSelectedRoundMedication?.(nextMed?.id || null);
    } else {
      setSelectedRoundMedication?.(null);
    }
    setPage('round-runner');
  }

  function isCatDone(animal) {
    if (roundType === 'med') {
      const activeMeds = medByAnimal.get(animal.id) || [];
      return activeMeds.length > 0 && activeMeds.every(med => completedMedKeys.has(`${animal.id}:${med.id}`));
    }
    return completedCareIds.has(animal.id);
  }

  function getProgressForCats(cats) {
    if (roundType === 'med') {
      const medCatsDone = new Set();
      for (const cat of cats) {
        const activeMeds = medByAnimal.get(cat.id) || [];
        if (activeMeds.length > 0 && activeMeds.every(med => completedMedKeys.has(`${cat.id}:${med.id}`))) {
          medCatsDone.add(cat.id);
        }
      }
      return getKennelProgress({ cats, completedAnimalIds: medCatsDone });
    }
    return getKennelProgress({ cats, completedAnimalIds: completedCareIds });
  }

  const title = roundType === 'med' ? 'Medication Round' : `${shift} Care Round`;

  return (
    <main className="roundBoardScreen">
      <div className="roundsTop">
        <button type="button" className="roundsClose" onClick={() => setPage('dashboard')}>
          <ArrowLeft size={20}/>
        </button>
        <h1>{title}</h1>
        <span/>
      </div>

      <section className={roundType === 'med' ? 'roundBoardHero blue' : 'roundBoardHero'}>
        <div>
          <p>{roundType === 'med' ? 'Select a cat for meds' : 'Select a cat to sign off'}</p>
          <h2>Grouped by kennel</h2>
          <small>Tap a cat card to open the sign-off screen.</small>
        </div>
        {roundType === 'med' ? <Pill size={34}/> : <ClipboardCheck size={34}/>}
      </section>

      <label className="roundBoardSearch">
        <Search size={17}/>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search cats or kennels..."
        />
      </label>

      {kennelGroups.length === 0 && loungeAnimals.length === 0 ? (
        <section className="roundBoardEmpty">
          <CheckCircle2 size={34}/>
          <h2>Nothing due</h2>
          <p>{roundType === 'med' ? 'No medications are due right now.' : 'No cats match this round.'}</p>
        </section>
      ) : (
        <div className="roundKennelGroups">

          {/* Cat Lounge section at the top */}
          {roundType === 'med' && loungeAnimals.length > 0 && (
            <section className="roundKennelSection" key="lounge">
              <div className="roundKennelHeader">
                <span className="kennel blue">🏠</span>
                <div>
                  <h2>Cat Lounge</h2>
                  <small>
                    {loungeAnimals.filter(a => isCatDone(a)).length} of {loungeAnimals.length} complete
                  </small>
                </div>
                <ProgressPill progress={getProgressForCats(loungeAnimals)} />
              </div>

              <div className="roundKennelCards">
                {loungeAnimals.map(cat => {
                  const done = isCatDone(cat);
                  const activeMeds = medByAnimal.get(cat.id) || [];
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      className={`roundCatCard ${done ? 'done' : ''}`}
                      onClick={() => openCat(cat)}
                    >
                      <AnimalThumb animal={cat}/>
                      <span className="roundCatInfo">
                        <b>{cat.name}</b>
                        <small>{cat.shelterluv_status || 'Cat Lounge'}</small>
                        <small>{activeMeds.length} active med{activeMeds.length === 1 ? '' : 's'}</small>
                        <CatStatusBadge done={done} roundType={roundType}/>
                      </span>
                      <ChevronRight size={18}/>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Quarantine kennel groups */}
          {kennelGroups.map(({ kennel, cats }) => {
            const progress = getProgressForCats(cats);
            return (
              <section className="roundKennelSection" key={kennel}>
                <div className="roundKennelHeader">
                  <span className={`kennel ${getKennelColorClass(kennel)}`}>
                    {kennelShort(kennel)}
                  </span>
                  <div>
                    <h2>{kennel}</h2>
                    <small>{progress.completed} of {progress.total} complete</small>
                  </div>
                  <ProgressPill progress={progress}/>
                </div>

                <div className="roundKennelCards">
                  {cats.length === 0 && (
                    <div className="emptyKennelCard">
                      <b>Empty</b>
                      <small>No cats assigned</small>
                    </div>
                  )}
                  {cats.map(cat => {
                    const done = isCatDone(cat);
                    const activeMeds = medByAnimal.get(cat.id) || [];
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        className={`roundCatCard ${done ? 'done' : ''}`}
                        onClick={() => openCat(cat)}
                      >
                        <AnimalThumb animal={cat}/>
                        <span className="roundCatInfo">
                          <b>{cat.name}</b>
                          <small>{cat.sex || 'Unknown'} · {formatAge(cat.age)}</small>
                          {roundType === 'med' && (
                            <small>
                              {activeMeds.length} active med{activeMeds.length === 1 ? '' : 's'}
                            </small>
                          )}
                          <CatStatusBadge done={done} roundType={roundType}/>
                        </span>
                        <ChevronRight size={18}/>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}