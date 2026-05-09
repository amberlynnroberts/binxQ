import React from 'react';
import { AnimalThumb } from '../components/AnimalPhoto';
import { kennelShort } from '../components/ui';

export function Shift({ data }) {
  return (
    <main>
      <h1>Shift Check</h1>
      <p>This screen is ready for the next workflow: save AM/PM check rows to Supabase.</p>
      <div className="list">
        {data.animals.map(a => (
          <div className="row" key={a.id}>
            <span className="kennel">{kennelShort(a.kennel)}</span>
            <AnimalThumb animal={a}/>
            <span><b>{a.name}</b><small>Eating · Stool · Water · Clean · Concern</small></span>
          </div>
        ))}
      </div>
    </main>
  );
}
