import React from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { AnimalThumb } from '../components/AnimalPhoto';
import { Empty, kennelShort, Stat } from '../components/ui';

export function Dashboard({ data, alerts, setPage, select }) {
  return (
    <main>
      <h1>Quarantine Dashboard</h1>
      <p>Live data from Supabase. No hardcoded animals.</p>

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
      </div>
    </main>
  );
}
