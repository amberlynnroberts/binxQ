import React, { useState } from 'react';
import { Database } from 'lucide-react';
import { ShelterluvLiveSyncPanel } from '../components/ShelterluvLiveSyncPanel';

export function More({ reload, dbStatus, setDbStatus, setPage }) {
async function syncEverything() {
  try {
    setDbStatus('Syncing everything...');

    await syncShelterluvAnimals();
    await syncFromShelterluvApi();
    await reload();
    setShowSyncSuccess(true);

    setTimeout(() => {
      setShowSyncSuccess(false);
    }, 3000);

    setDbStatus('Everything synced.');
  } catch (err) {
    console.error(err);
    setDbStatus('Sync failed: ' + err.message);
  }
}
const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  return (
    <main>
      <h1>More</h1>
      <ShelterluvLiveSyncPanel reload={reload} />
      <section className="panel">
        <h2><Database size={18}/> Database</h2>
        <p><b>Status:</b> {dbStatus}</p>
      </section>

      <button
        type="button"
        className="actionCardButton"
        onClick={() => setPage('vet-calendar')}>
        Vet Calendar
      </button>

      <button
        className="actionCardButton"
        onClick={syncEverything}>
        Sync Everything
      </button>

      <button
        className="actionCardButton"
        onClick={() => setPage('reports')}>
        Reports
      </button>

      {showSyncSuccess && (
        <div className="syncToast">
          ✅ Everything synced successfully
        </div>
      )}
    </main>
  );
}