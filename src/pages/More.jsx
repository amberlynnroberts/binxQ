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

      <div className="syncButtonGrid">
        <button
          type="button"
          className="actionCardButton"
          onClick={() => setPage('vet-calendar')}>
          Vet Calendar
        </button>

        <button
          type="button"
          className="actionCardButton"
          onClick={() => setPage('vet-day-list')}>
          Vet Day List
        </button>

        <button
          type="button"
          className="actionCardButton"
          onClick={() => setPage('adoption-records')}>
          Adoption Records
        </button>

        <button
          type="button"
          className="actionCardButton"
          onClick={syncEverything}>
          Sync Everything
        </button>

        <button
          type="button"
          className="actionCardButton"
          onClick={() => setPage('reports')}>
          Reports
        </button>

        {/* <button
          type="button"
          className="actionCardButton"
          onClick={() => setPage('kennel-card-generator')}>
          Kennel Card Generator
        </button> */}

        <button
          type="button"
          className="actionCardButton"
          onClick={() => setPage('manage-employees')}>
          Manage Employees
        </button>

        {/* <button
          className="actionCardButton"
          onClick={() => setPage('quarantine-card-generator')}>
          📋 Quarantine Cards
        </button> */}
      </div>

      {showSyncSuccess && (
        <div className="syncToast">
          ✅ Everything synced successfully
        </div>
      )}
    </main>
  );
}
