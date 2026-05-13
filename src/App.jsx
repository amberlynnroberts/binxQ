import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from './components/Layout';
import { AnimalForm, defaultAnimalForm } from './components/AnimalForm';
import { createQuarantineAnimal, updateQuarantineAnimal } from './lib/api';
import { useKennelData } from './hooks/useKennelData';
import { Dashboard } from './pages/Dashboard';
import { Kennels } from './pages/Kennels';
import { AnimalCard } from './pages/AnimalCard';
import { Meds } from './pages/Meds';
import { Shift } from './pages/Shift';
import { More } from './pages/More';
import { TextAlert } from './pages/TextAlert';
import { filterAnimalsByView } from './lib/animalFilters';

export default function App() {
  const { data, loading, dbStatus, setDbStatus, reload } = useKennelData();
  const [page, setPage] = useState('dashboard');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('kennelcheck-theme') || 'dark');
  const [animalView, setAnimalView] = useState('quarantine');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kennelcheck-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!selected && data.animals.length) setSelected(data.animals[0].id);
  }, [data.animals, selected]);

  const animal = data.animals.find(a => a.id === selected) || data.animals[0];

  const alerts = useMemo(() => {
    return data.animals.filter(a =>
      a.status === 'Quarantine' ||
      a.symptoms.includes('Not eating') ||
      a.symptoms.includes('Cleaning overdue') ||
      a.symptoms.includes('Diarrhea')
    ).slice(0, 5);
  }, [data.animals]);

  function selectAnimal(id) {
    setSelected(id);
    setPage('card');
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

  const editInitial = animal ? {
    name: animal.name || '',
    species: animal.species || 'Cat',
    sex: animal.sex || 'Unknown',
    age: animal.age || '',
    color: animal.desc || '',
    intake_date: animal.intake || new Date().toISOString().slice(0, 10),
    kennel_number: animal.kennel || 'Quarantine Kennel 1',
    local_status: animal.status || 'Quarantine'
  } : defaultAnimalForm();

  const visibleAnimals = filterAnimalsByView(data.animals, animalView);
  const visibleData = { ...data, animals: visibleAnimals };

  return (
    <Layout
      page={page}
      setPage={setPage}
      reload={reload}
      dbStatus={dbStatus}
      loading={loading}
      theme={theme}
      toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
    >
      {page === 'dashboard' && <Dashboard data={visibleData} alerts={alerts} setPage={setPage} select={selectAnimal}/>}
      {page === 'kennels' && <Kennels data={visibleData} allAnimals={data.animals} query={query} setQuery={setQuery} select={selectAnimal} add={() => setPage('add')} animalView={animalView} setAnimalView={setAnimalView}/>}
      {page === 'add' && <AnimalForm title="Add Cat to Quarantine" initialForm={defaultAnimalForm()} submitText="Add Cat" onSubmit={addAnimal} onCancel={() => setPage('kennels')}/>}
      {page === 'card' && animal && <AnimalCard animal={animal} data={data} reload={reload} back={() => setPage('kennels')} edit={() => setPage('edit')}/>}
      {page === 'edit' && animal && <AnimalForm title={`Edit ${animal.name}`} initialForm={editInitial} submitText="Save Changes" onSubmit={editAnimal} onCancel={() => setPage('card')}/>}
      {page === 'meds' && <Meds data={visibleData} select={selectAnimal}/>}
      {page === 'shift' && <Shift data={visibleData}/>}
      {page === 'more' && <More reload={reload} dbStatus={dbStatus} setDbStatus={setDbStatus} setPage={setPage}/>}
      {page === 'text-alert' && <TextAlert />}

    </Layout>
  );
}
