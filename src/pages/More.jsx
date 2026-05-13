import React from 'react';
import { Database } from 'lucide-react';
import { ShelterluvLiveSyncPanel } from '../components/ShelterluvLiveSyncPanel';

export function More({ reload, dbStatus }) {
  return (
    <main>
      <h1>More</h1>

      <ShelterluvLiveSyncPanel reload={reload} />

      <section className="panel">
        <h2><Database size={18}/> Database</h2>
        <p><b>Status:</b> {dbStatus}</p>
      </section>
    </main>
  );
}