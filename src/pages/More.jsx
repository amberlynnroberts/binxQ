import React from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { syncFromMockShelterluv } from '../lib/api';

export function More({ reload, dbStatus, setDbStatus }) {
  async function sync() {
    try {
      setDbStatus('Syncing mock Shelterluv...');
      await syncFromMockShelterluv();
      await reload();
    } catch (err) {
      console.error(err);
      setDbStatus('Sync failed: ' + err.message);
    }
  }

  return (
    <main>
      <h1>More</h1>
      <section className="panel">
        <h2><Database size={18}/> Database</h2>
        <p><b>Status:</b> {dbStatus}</p>
        <button className="primary" onClick={sync}><RefreshCw size={16}/> Sync Mock Shelterluv</button>
      </section>
      <section className="panel">
        <h2>Setup reminder</h2>
        <p>Run <code>supabase_complete_setup.sql</code> in Supabase, then add your project URL and publishable key to <code>.env</code>.</p>
      </section>
    </main>
  );
}
