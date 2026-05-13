import React, { useEffect, useState } from 'react';
import { RefreshCw, PlugZap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { syncFromShelterluv, fetchShelterluvSyncRuns } from '../lib/shelterluvSyncApi';

export function ShelterluvLiveSyncPanel({ reload }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [runs, setRuns] = useState([]);

  async function loadRuns() {
    try {
      setRuns(await fetchShelterluvSyncRuns());
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadRuns();
  }, []);

  async function sync() {
    setBusy(true);
    setMessage('');

    try {
      const result = await syncFromShelterluv();
      setMessage(`Shelterluv sync complete: ${result.animals_upserted || 0} animals updated.`);
      await reload?.();
      await loadRuns();
    } catch (err) {
      console.error(err);
      setMessage(`Shelterluv sync failed: ${err.message || 'Unknown error'}`);
      await loadRuns();
    } finally {
      setBusy(false);
    }
  }

  const latest = runs[0];

  return (
    <section className="panel">
      <h2><PlugZap size={18}/> Shelterluv Integration</h2>
      <p>Pull animals from Shelterluv into KennelCheck. Shelterluv stays the source of truth; KennelCheck tracks quarantine operations.</p>

      <button className="primary" onClick={sync} disabled={busy}>
        <RefreshCw size={16}/>
        {busy ? 'Syncing Shelterluv...' : 'Sync Shelterluv'}
      </button>

      {message && (
        <p className={message.includes('failed') ? 'error' : 'success'}>
          {message.includes('failed') ? <AlertTriangle size={16}/> : <CheckCircle2 size={16}/>}
          {message}
        </p>
      )}

      {latest && (
        <div className="history">
          <span>Last sync</span>
          <p>
            Status: <b>{latest.status}</b><br/>
            Animals seen: {latest.animals_seen}<br/>
            Animals updated: {latest.animals_upserted}<br/>
            Started: {new Date(latest.started_at).toLocaleString()}
          </p>
          {latest.error_message && <p className="error">{latest.error_message}</p>}
        </div>
      )}
    </section>
  );
}
