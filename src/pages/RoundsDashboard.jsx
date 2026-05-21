import React, { useEffect, useMemo, useState } from 'react';
import { fetchCleaningSignoffsForDate } from '../lib/dailyCareStatusApi';
import { currentHour, getMissingCleaningTasks, todayDateString } from '../lib/careTaskRules';
import { AlertTriangle, ClipboardCheck, ChevronRight, Heart, Pill, Stethoscope } from 'lucide-react';

function RoundCard({ icon: Icon, title, subtitle, count, tone, onClick }) {
  return (
    <button type="button" className={`roundStartCard ${tone}`} onClick={onClick}>
      <span className="roundStartIcon"><Icon size={31}/></span>
      <span>
        <b>{title}</b>
        <small>{subtitle}</small>
        <small>{count}</small>
      </span>
      <ChevronRight/>
    </button>
  );
}

function GlanceCard({ label, value, tone }) {
  return (
    <div className={`roundGlance ${tone}`}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export function RoundsDashboard({ data, alerts = [], setPage, startRound }) {
  const [cleaningSignoffs, setCleaningSignoffs] = useState([]);
  const animals = data?.animals || [];
  const meds = (data?.meds || []).filter(m => m.active);

  useEffect(() => {
    fetchCleaningSignoffsForDate(todayDateString()).then(setCleaningSignoffs).catch(console.error);
  }, [animals.length]);

  const careTasks = useMemo(() => {
    return getMissingCleaningTasks({ animals, cleaningSignoffs, hour: currentHour() });
  }, [animals, cleaningSignoffs]);

  const needs = [
    ...careTasks.map(task => ({ animal: task.animal, text: task.label, priority: 'High', icon: AlertTriangle })),
    ...(alerts || []).slice(0, 4).map(alert => ({
      animal: animals.find(a => a.id === alert.animalId || a.id === alert.animal_id),
      text: alert.text || alert.symptom || 'Needs attention',
      priority: 'Medium',
      icon: Heart
    }))
  ].filter(item => item.animal);

  return (
    <main className="roundsDashboard">
      <section className="roundsWelcome">
        <p>Binx-Q</p>
        <h1>
          {(() => {
            const hour = new Date().getHours();
            if (hour >= 6 && hour < 12) {
              return 'Good morning! 👋';
            }
            if (hour >= 12 && hour < 17) {
              return 'Good afternoon! ☀️';
            }
            return 'Good evening! 🌙';
          })()}
        </h1>
        <small>Here’s what needs your attention today.</small>
      </section>
      {needs.length > 0 && (
        <button type="button" className="roundOverdueBanner" onClick={() => setPage('round-select')}>
          <AlertTriangle/>
          <span>
            <b>{needs.length} tasks are overdue</b>
            <small>Tap to view</small>
          </span>
        </button>
      )}
      <section>
        <h2 className="roundSectionLabel">Start a Round</h2>
        <div className="roundStartList">
 <RoundCard
  icon={ClipboardCheck}
  title="AM Care Round"
  subtitle="Cleaning, Feeding, Water"
  count={
    careTasks.filter(t => t.shift === 'AM').length === 0
      ? 'DONE!'
      : `${animals.length} cats`
  }
  tone="green"
  onClick={() => startRound('care', 'AM')}
/>
          <RoundCard icon={ClipboardCheck} title="PM Care Round" subtitle="Cleaning, Feeding, Water" count={careTasks.filter(t => t.shift === 'PM').length === 0 ? 'DONE!' : `${animals.length} cats`} tone="blue"
            onClick={() => startRound('care', 'PM')}/>
          <RoundCard icon={Pill} title="Medication Round" subtitle={`${meds.length} medications due`} count={`${new Set(meds.map(m => m.animalId)).size} cats`} tone="purple"
            onClick={() => startRound('med', 'AM')}/>
           <RoundCard icon={Stethoscope} title="Quarantine Checks" subtitle="Focused checks" count={`${animals.filter(a => String(a.status).toLowerCase().includes('quarantine')).length} cats`} tone="purple" onClick={() => setPage('kennels')} />
        </div>
      </section>

      <section className="roundGlancePanel">
        <h2 className="roundSectionLabel">Today at a glance</h2>
        <div className="roundGlanceGrid">
          <GlanceCard label="Tasks" value={careTasks.length} tone="green"/>
          <GlanceCard label="Meds Due" value={meds.length} tone="blue"/>
          <GlanceCard label="Overdue" value={needs.length} tone="red"/>
          <GlanceCard label="Cats" value={animals.length} tone="white"/>
        </div>
      </section>

      <section className="roundNeedsPanel">
        <h2 className="roundSectionLabel">Needs Attention</h2>
        {needs.length === 0 ? (
          <div className="roundEmpty">Nothing needs attention right now.</div>
        ) : (
          <div className="roundNeedsList">
            {needs.slice(0, 5).map((item, index) => {
              const Icon = item.icon;
              return (
                <button type="button" key={`${item.animal.id}-${index}`} onClick={() => setPage('round-select')}>
                  <Icon/>
                  <span>
                    <b>{item.animal.name}</b>
                    <small>{item.text}</small>
                    <small>Kennel {item.animal.kennel || 'Unassigned'}</small>
                  </span>
                  <em>{item.priority}</em>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
