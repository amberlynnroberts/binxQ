import React, { useEffect, useMemo, useState } from 'react';
import { AnimalForm, defaultAnimalForm } from './components/AnimalForm';
import { createQuarantineAnimal, updateQuarantineAnimal } from './lib/api';
import { useKennelData } from './hooks/useKennelData';
import { Reports } from './pages/Reports';
import { Kennels } from './pages/Kennels';
import { AnimalCard } from './pages/AnimalCard';
import { Meds } from './pages/Meds';
import { Shift } from './pages/Shift';
import { More } from './pages/More';
import { TextAlert } from './pages/TextAlert';
import { DailyCare } from './pages/DailyCare';
import { filterAnimalsByView } from './lib/animalFilters';
import { RoundsShell } from './components/RoundsShell';
import { RoundsDashboard } from './pages/RoundsDashboard';
import { RoundSelect } from './pages/RoundSelect';
import { RoundRunner } from './pages/RoundRunner';
import { RoundSummary } from './pages/RoundSummary';

export default function App() {
  const { data, loading, dbStatus, setDbStatus, reload } = useKennelData();
  const [roundSummary, setRoundSummary] = useState({completed: 0, skipped: 0, roundType: 'care', shift: 'AM'});
  const [page, setPage] = useState('dashboard');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('kennelcheck-theme') || 'dark');
  const [animalView, setAnimalView] = useState('quarantine');
  const [activeRound, setActiveRound] = useState({ type: 'care', shift: 'AM' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kennelcheck-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!selected && data.animals.length) setSelected(data.animals[0].id);
  }, [data.animals, selected]);

  const animal = data.animals.find(a => a.id === selected) || data.animals[0];

  const alerts = useMemo(() => {
    return data.animals
      .filter(a =>
        a.status === 'Quarantine' ||
        a.symptoms.includes('Not eating') ||
        a.symptoms.includes('Cleaning overdue') ||
        a.symptoms.includes('Diarrhea')
      )
      .slice(0, 5);
  }, [data.animals]);

  const visibleAnimals = filterAnimalsByView(data.animals, animalView);
  const visibleData = { ...data, animals: visibleAnimals };

  function selectAnimal(id) {
    setSelected(id);
    setPage('card');
  }

  function startRound(type, shift = 'AM') {
    setActiveRound({ type, shift });
    setPage('round-runner');
  }

  async function addAnimal(form) {
    await createQuarantineAnimal(form);
    await reload();
    setPage('kennels');
  }

  async function editAnimal(form) {
    await updateQuarantineAnimal(animal.id, animal.shelterluv_id, form);
    await reload();
    setPage('card');
  }

  const editInitial = animal
    ? {
        name: animal.name || '',
        species: animal.species || 'Cat',
        sex: animal.sex || 'Unknown',
        age: animal.age || '',
        color: animal.desc || '',
        intake_date: animal.intake || new Date().toISOString().slice(0, 10),
        kennel_number: animal.kennel || 'Quarantine Kennel 1',
        local_status: animal.status || 'Quarantine'
      }
    : defaultAnimalForm();

  return (
    <RoundsShell page={page} setPage={setPage} animalView={animalView} setAnimalView={setAnimalView}>
      {page === 'dashboard' && (
        <RoundsDashboard
          data={visibleData}
          alerts={alerts}
          setPage={setPage}
          startRound={startRound}
        />
      )}

      {page === 'round-select' && (
        <RoundSelect
          data={visibleData}
          setPage={setPage}
          startRound={startRound}
        />
      )}

      {page === 'round-runner' && (
        <RoundRunner
          data={visibleData}
          roundType={activeRound.type}
          shift={activeRound.shift}
          setPage={setPage}
          reload={reload}
          setRoundSummary={setRoundSummary}
        />
      )}

      {page === 'daily-care' && (
        <DailyCare
          data={visibleData || data}
          reload={reload}
        />
      )}

      {page === 'kennels' && (
        <Kennels
          data={visibleData}
          allAnimals={data.animals}
          query={query}
          setQuery={setQuery}
          select={selectAnimal}
          add={() => setPage('add')}
          animalView={animalView}
          setAnimalView={setAnimalView}
        />
      )}

      {page === 'add' && (
        <AnimalForm
          title="Add Cat to Quarantine"
          initialForm={defaultAnimalForm()}
          submitText="Add Cat"
          onSubmit={addAnimal}
          onCancel={() => setPage('kennels')}
        />
      )}

      {page === 'card' && animal && (
        <AnimalCard
          animal={animal}
          data={data}
          reload={reload}
          back={() => setPage('kennels')}
          edit={() => setPage('edit')}
        />
      )}

      {page === 'edit' && animal && (
        <AnimalForm
          title={`Edit ${animal.name}`}
          initialForm={editInitial}
          submitText="Save Changes"
          onSubmit={editAnimal}
          onCancel={() => setPage('card')}
        />
      )}

      {page === 'meds' && (
        <Meds
          data={visibleData}
          select={selectAnimal}
        />
      )}

      {page === 'shift' && (
        <Shift data={visibleData} />
      )}

      {page === 'more' && (
        <More
          reload={reload}
          dbStatus={dbStatus}
          setDbStatus={setDbStatus}
          setPage={setPage}
        />
      )}

      {page === 'round-summary' && (
        <RoundSummary
          completed={roundSummary.completed}
          skipped={roundSummary.skipped}
          roundType={roundSummary.roundType}
          shift={roundSummary.shift}
          setPage={setPage}
        />
      )}
      
      {page === 'reports' && (
        <Reports />
      )}

      {page === 'text-alert' && <TextAlert />}
    </RoundsShell>
  );
}