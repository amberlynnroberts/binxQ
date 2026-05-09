import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Empty, kennelShort } from '../components/ui';

export function Meds({ data, select }) {
  return (
    <main>
      <h1>Meds Due</h1>
      <div className="list">
        {data.meds.length === 0 && <Empty text="No active meds due." />}
        {data.meds.map(m => {
          const a = data.animals.find(x => x.id === m.animalId);
          if (!a) return null;
          return (
            <button className="row" key={m.id} onClick={() => select(a.id)}>
              <span className="badge red">{m.schedule}</span>
              <span className="kennel">{kennelShort(a.kennel)}</span>
              <span><b>{a.name}</b><small>{m.name} ({m.dose})</small></span>
              <b>{m.nextDue}</b>
              <ChevronRight/>
            </button>
          );
        })}
      </div>
    </main>
  );
}
