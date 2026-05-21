import React from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { AnimalThumb } from '../components/AnimalPhoto';
import { Empty, kennelShort, Stat } from '../components/ui';
import { DailyCareDashboardAlerts} from '../components/DailyCareDashboardAlerts';
import { useEffect, useMemo, useState } from 'react';
import { fetchCleaningSignoffsForDate } from '../lib/dailyCareStatusApi';
import {
  currentHour,
  getMissingCleaningTasks,
  todayDateString
} from '../lib/careTaskRules';

  export function Dashboard({ data, alerts, setPage, select }) {
    const [cleaningSignoffs, setCleaningSignoffs] = useState([]);
    console.log(data);

  useEffect(() => {
    fetchCleaningSignoffsForDate(todayDateString())
      .then(setCleaningSignoffs)
      .catch(console.error);
  }, [data.animals.length]);

  const cleaningTasks = useMemo(() => {
    return getMissingCleaningTasks({
      animals: data.animals,
      cleaningSignoffs,
      hour: currentHour()
    });
  }, [data.animals, cleaningSignoffs]);
  return (
    <main>
      <h1>Quarantine Dashboard</h1>
      <p>Live data from Supabase. NOT ShelterLuv</p>

      <section className="stats">
        <Stat n={data.animals.length} t="Animals" kind="green"/>
        <Stat n={alerts.length} t="Need attention" kind="yellow"/>
        <Stat n={data.meds.length} t="Meds due" kind="red"/>
      </section>

      <div className="title">
        <h2>Needs Attention</h2>
        <button className="primary" onClick={() => setPage('add')}><Plus size={16}/> Add Cat</button>
      </div>

      <div className="list">
        {alerts.length === 0 && <Empty text="No urgent quarantine alerts." />}
        {alerts.map(a => (
          <button className="row" onClick={() => select(a.id)} key={a.id}>
            <span className="kennel">{kennelShort(a.kennel)}</span>
            <AnimalThumb animal={a}/>
            <span><b>{a.name}</b><small>{a.symptoms[0] || a.status}</small></span>
            <em>{a.status}</em>
            <ChevronRight/>
          </button>
        ))}
        {cleaningTasks.map(task => (
          <button
            className="row"
            key={task.id}
            onClick={() => setPage('daily-care')}>
            <span className="kennel red">{task.animal.kennel || '?'}</span>
            <span>
              <b>{task.animal.name}</b>
              <small>Due: {task.label}</small>
              <small>{task.dueLabel}</small>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
