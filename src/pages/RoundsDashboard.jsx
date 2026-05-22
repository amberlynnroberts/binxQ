import React, { useEffect, useMemo, useState } from 'react';
import { fetchCleaningSignoffsForDate } from '../lib/dailyCareStatusApi';
import {
  currentHour,
  getMissingCleaningTasks,
  todayDateString
} from '../lib/careTaskRules';

import {
  ClipboardCheck,
  Pill
} from 'lucide-react';

function RoundCard({
  icon: Icon,
  title,
  subtitle,
  count,
  tone,
  onClick
}) {
  return (
    <button
      type="button"
      className={`roundStartCard ${tone}`}
      onClick={onClick}
    >
      <span className="roundStartIcon">
        <Icon size={31}/>
      </span>

      <span>
        <b>{title}</b>
        <small>{subtitle}</small>
        <small>{count}</small>
      </span>
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

function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good morning! 👋';
  }

  if (hour >= 12 && hour < 17) {
    return 'Good afternoon! ☀️';
  }

  return 'Good evening! 🌙';
}

export function RoundsDashboard({
  data,
  setPage,
  startRound
}) {
  const [cleaningSignoffs, setCleaningSignoffs] = useState([]);

  const animals = data?.animals || [];
  const meds = (data?.meds || []).filter(m => m.active);

  useEffect(() => {
    fetchCleaningSignoffsForDate(todayDateString())
      .then(setCleaningSignoffs)
      .catch(console.error);
  }, [animals.length]);

  const careTasks = useMemo(() => {
    return getMissingCleaningTasks({
      animals,
      cleaningSignoffs,
      hour: currentHour()
    });
  }, [animals, cleaningSignoffs]);

  const greeting = getGreeting();

  return (
    <main className="roundsDashboard cleanDashboard">
      <section className="roundsWelcome cleanHero">
        <p>Binx-Q</p>

        <h1>{greeting}</h1>

        <small>
          Choose a round to start today’s care.
        </small>
      </section>

      <section>
        <h2 className="roundSectionLabel">
          Start a Round
        </h2>

        <div className="roundStartList cleanRoundGrid">

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

          <RoundCard
            icon={ClipboardCheck}
            title="PM Care Round"
            subtitle="Cleaning, Feeding, Water"
            count={
              careTasks.filter(t => t.shift === 'PM').length === 0
                ? 'DONE!'
                : `${animals.length} cats`
            }
            tone="blue"
            onClick={() => startRound('care', 'PM')}
          />

          <RoundCard
            icon={Pill}
            title="Medication Round"
            subtitle={`${meds.length} medications due`}
            count={`${new Set(meds.map(m => m.animalId)).size} cats`}
            tone="purple"
            onClick={() => startRound('med', 'AM')}
          />

          <RoundCard
            icon={ClipboardCheck}
            title="Quarantine Checklist"
            subtitle="AM / PM room procedures"
            count="Tap to complete"
            tone="purple"
            onClick={() => setPage('quarantine-checklist')}
          />

        </div>
      </section>

      <section className="roundGlancePanel cleanStatsPanel">
        <h2 className="roundSectionLabel">
          Today at a glance
        </h2>

        <div className="roundGlanceGrid cleanStatsGrid">

          <GlanceCard
            label="Tasks Due"
            value={careTasks.length}
            tone="green"
          />

          <GlanceCard
            label="Meds Due"
            value={meds.length}
            tone="blue"
          />

          <GlanceCard
            label="Cats"
            value={animals.length}
            tone="white"
          />

        </div>
      </section>
    </main>
  );
}