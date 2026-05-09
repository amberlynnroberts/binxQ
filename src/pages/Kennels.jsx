import React from 'react';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { AnimalThumb } from '../components/AnimalPhoto';
import { Empty, kennelShort } from '../components/ui';

export function Kennels({ data, query, setQuery, select, add }) {
  const list = data.animals.filter(a =>
    `${a.name} ${a.kennel} ${a.status} ${a.desc}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main>
      <div className="title">
        <h1>Quarantine Kennels</h1>
        <button className="primary" onClick={add}><Plus size={18}/> Add</button>
      </div>

      <label className="search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search cats or kennels..." /></label>

      <div className="list">
        {list.length === 0 && <Empty text="No cats showing. Check Supabase data and app env keys." />}
        {list.map(a => (
          <button className="row" key={a.id} onClick={() => select(a.id)}>
            <span className={'kennel ' + String(a.status).toLowerCase()}>{kennelShort(a.kennel)}</span>
            <AnimalThumb animal={a}/>
            <span><b>{a.name}</b><small>{a.desc} • {a.sex} • {a.age}</small></span>
            <em>{a.status}</em>
            <ChevronRight/>
          </button>
        ))}
      </div>
    </main>
  );
}
