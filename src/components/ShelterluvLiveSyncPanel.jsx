import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, PlugZap, RefreshCw } from 'lucide-react';
import {
  fetchShelterluvSyncRuns,
  syncShelterluvArchived,
  syncShelterluvInCustody,
  syncShelterluvQuarantine
} from '../lib/shelterluvLiveApi';

export function ShelterluvLiveSyncPanel({ reload }) {
  const [busyMode, setBusyMode] = useState('');
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

  async function runSync(mode) {
    setBusyMode(mode);
    setMessage('');

    try {
      let result;

      if (mode === 'quarantine') result = await syncShelterluvQuarantine();
      else if (mode === 'archived') result = await syncShelterluvArchived();
      else result = await syncShelterluvInCustody();

      setMessage(`${mode} sync complete: ${result.animals_upserted || 0} animals updated.`);
      if (typeof reload === 'function') await reload();
      await loadRuns();
    } catch (err) {
      console.error(err);
      setMessage(`Shelterluv sync failed: ${err.message || 'Unknown error'}`);
      await loadRuns();
    } finally {
      setBusyMode('');
    }
  }

  const latest = runs[0];

  return (
    <section className="panel">
      <h2><PlugZap size={18}/> Shelterluv Live Sync</h2>
      <p>Pull animal data from Shelterluv into KennelCheck.</p>

      <div className="syncButtonGrid">
        <button className="primary full" type="button" onClick={() => runSync('quarantine')} disabled={!!busyMode}>
          <RefreshCw size={16}/>
          {busyMode === 'quarantine' ? 'Syncing...' : 'Sync Quarantine'}
        </button>

        <button className="link full" type="button" onClick={() => runSync('in_custody')} disabled={!!busyMode}>
          <RefreshCw size={16}/>
          {busyMode === 'in_custody' ? 'Syncing...' : 'Sync In Custody'}
        </button>

        <button className="link full" type="button" onClick={() => runSync('archived')} disabled={!!busyMode}>
          <RefreshCw size={16}/>
          {busyMode === 'archived' ? 'Syncing...' : 'Sync Archived'}
        </button>
      </div>

      {message && (
        <p className={message.includes('failed') ? 'error' : 'success'}>
          {message.includes('failed') ? <AlertTriangle size={16}/> : <CheckCircle2 size={16}/>}
          {message}
        </p>
      )}

      {latest && (
        <div className="history">
          <p>
            <b>Last sync:</b> {new Date(latest.started_at).toLocaleString()}<br/>
            <b>Status:</b> {latest.status}<br/>
            <b>Animals seen:</b> {latest.animals_seen}<br/>
            <b>Animals updated:</b> {latest.animals_upserted}
          </p>
          {latest.error_message && <p className="error">{latest.error_message}</p>}
        </div>
      )}
    </section>
  );
}
