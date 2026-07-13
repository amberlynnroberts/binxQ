import React, { useEffect, useMemo, useState } from 'react';
import { fetchCleaningSignoffsForDate } from '../lib/dailyCareStatusApi';
import { fetchDailyCareSignoffs } from '../lib/dailyCareApi';
import { currentHour, getMissingCleaningTasks, todayDateString } from '../lib/careTaskRules';
import {
  Bell,
  CheckCircle2,
  ClipboardCheck,
  ChevronRight,
  Pill,
} from 'lucide-react';
import { fetchUpcomingVetEvents, summarizeVetEvents } from '../lib/vetEventsApi';
import { fetchDailyReport } from '../lib/reportsApi';
import { medNeededForShift } from '../lib/medUtils';

function RoundCard({ icon: Icon, title, subtitle, count, tone, onClick, complete, disabled, badges }) {
  return (
    <button
      type="button"
      className={`roundStartCard ${tone} ${disabled ? 'disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span className="roundStartIconWrap">
        <span className="roundStartIcon">
          <Icon size={31} />
        </span>
        {complete && (
          <span className="roundCompleteBadge">
            <CheckCircle2 size={22} />
          </span>
        )}
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <b>{title}</b>
        <small>{subtitle}</small>
        {badges ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
            {badges.map(b => (
              <small key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {b.done ? <CheckCircle2 size={12} /> : null}
                {b.label}
              </small>
            ))}
          </div>
        ) : (
          <small>{count}</small>
        )}
      </div>

      <ChevronRight />
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
  if (hour >= 5 && hour < 12) return 'Good morning! 👋';
  if (hour >= 12 && hour < 17) return 'Good afternoon! ☀️';
  return 'Good evening! 🌙';
}

export function RoundsDashboard({ data, setPage, startRound }) {
  const [cleaningSignoffs, setCleaningSignoffs] = useState([]);
  const [medSignoffsAM, setMedSignoffsAM] = useState({ cleaning: [], medication: [] });
  const [medSignoffsPM, setMedSignoffsPM] = useState({ cleaning: [], medication: [] });
  const [upcomingVetEvents, setUpcomingVetEvents] = useState([]);
  const [checklistSignoffs, setChecklistSignoffs] = useState({ AM: null, PM: null });

  const animals = data?.animals || [];
  const meds = (data?.meds || []).filter(m => m.active);

  useEffect(() => {
    fetchCleaningSignoffsForDate(todayDateString())
      .then(setCleaningSignoffs)
      .catch(console.error);
  }, [animals.length]);

  useEffect(() => {
    const careDate = todayDateString();
    Promise.all([
      fetchDailyCareSignoffs({ careDate, shift: 'AM' }),
      fetchDailyCareSignoffs({ careDate, shift: 'PM' }),
    ])
      .then(([am, pm]) => {
        setMedSignoffsAM(am);
        setMedSignoffsPM(pm);
      })
      .catch(console.error);
  }, [meds.length]);

  useEffect(() => {
    fetchUpcomingVetEvents({ days: 7 })
      .then(setUpcomingVetEvents)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const today = todayDateString();
    fetchDailyReport({ startDate: today, endDate: today })
      .then(report => {
        const am = report.quarantine.find(r => r.check_type === 'checklist_AM');
        const pm = report.quarantine.find(r => r.check_type === 'checklist_PM');
        setChecklistSignoffs({ AM: am || null, PM: pm || null });
      })
      .catch(console.error);
  }, []);

  const careTasks = useMemo(() => {
    // Cats with no kennel number assigned ('?') are excluded from the
    // AM/PM percentage math here, matching the same exclusion already
    // applied on the Kennel board page (RoundKennels.jsx) — they aren't
    // tied to a trackable room for cleaning purposes yet, so they
    // shouldn't count toward "X% complete" here either.
    const trackedAnimals = animals.filter(a => a.kennel && a.kennel !== '?');
    return getMissingCleaningTasks({
      animals: trackedAnimals,
      cleaningSignoffs,
      hour: currentHour()
    });
  }, [animals, cleaningSignoffs]);

  const greeting = getGreeting();
  const nowHour = new Date().getHours();
  const totalCats = animals.filter(a => a.kennel && a.kennel !== '?').length || 0;

  const amRemaining = careTasks.filter(t => t.shift === 'AM').length;
  const pmRemaining = careTasks.filter(t => t.shift === 'PM').length;

  const amUnlocked = nowHour >= 8;
  // FIXED: previously nowHour >= 14 (2PM), but careTaskRules.js's
  // PM_CLEANING_DUE_HOUR is 15 (3PM) — the threshold that actually
  // decides whether a PM task counts as "due"/"missing". Between 2-3PM,
  // this tile was unlocking and computing a percentage before any PM
  // task was even considered due yet, so pmRemaining was always 0 in
  // that window — producing a false 100% instead of "Not yet available".
  const pmUnlocked = nowHour >= 15;

  const amComplete = amUnlocked && careTasks.filter(t => t.shift === 'AM').length > 0 && amRemaining === 0;
  const pmComplete = pmUnlocked && careTasks.filter(t => t.shift === 'PM').length > 0 && pmRemaining === 0;

  const amPercent = totalCats
    ? Math.round(((totalCats - amRemaining) / totalCats) * 100)
    : 0;

  const pmPercent = pmUnlocked && totalCats
    ? Math.round(((totalCats - pmRemaining) / totalCats) * 100)
    : 0;

  // FIXED: previously medTotal/medComplete/medPercent never checked any real
  // signoff data — medComplete was only true if there were literally zero
  // medications, and medPercent could only ever be 0 or 100. Now this counts
  // every (animal, medication, shift) combination actually due today across
  // both AM and PM, and checks it against real medication_signoffs rows —
  // the same signoff data Meds.jsx and RoundKennels.jsx already use.
  const { medTotal, medDoneCount } = useMemo(() => {
    const givenKeys = new Set();
    for (const row of medSignoffsAM.medication || []) {
      givenKeys.add(`${row.animal_id}:${row.medication_id}:AM`);
    }
    for (const row of medSignoffsPM.medication || []) {
      givenKeys.add(`${row.animal_id}:${row.medication_id}:PM`);
    }

    let total = 0;
    let done = 0;

    for (const med of meds) {
      const needsAM = medNeededForShift(med, 'AM');
      const needsPM = medNeededForShift(med, 'PM');

      if (needsAM) {
        total += 1;
        if (givenKeys.has(`${med.animalId}:${med.id}:AM`)) done += 1;
      }
      if (needsPM) {
        total += 1;
        if (givenKeys.has(`${med.animalId}:${med.id}:PM`)) done += 1;
      }
    }

    return { medTotal: total, medDoneCount: done };
  }, [meds, medSignoffsAM, medSignoffsPM]);

  const medComplete = medTotal > 0 && medDoneCount === medTotal;
  const medPercent = medTotal
    ? Math.round((medDoneCount / medTotal) * 100)
    : 100;

  const vetSummary = summarizeVetEvents(upcomingVetEvents);

  const checklistBadges = [
    { label: `AM ${checklistSignoffs.AM ? 'Complete' : 'Not Complete'}`, done: Boolean(checklistSignoffs.AM) },
    { label: `PM ${checklistSignoffs.PM ? 'Complete' : 'Not Complete'}`, done: Boolean(checklistSignoffs.PM) }
  ];

  const checklistComplete = Boolean(checklistSignoffs.AM && checklistSignoffs.PM);

  return (
    <main className="roundsDashboard cleanDashboard">
      <section className="roundsWelcome cleanHero">
        <p>Binx-Q</p>
        <h1>{greeting}</h1>

        <button
          type="button"
          className={
            vetSummary.overdue > 0
              ? 'vetDashboardAlert danger'
              : vetSummary.dueSoon > 0
                ? 'vetDashboardAlert warning'
                : 'vetDashboardAlert clear'
          }
          onClick={() => setPage('vet-calendar')}
        >
          <Bell size={22} />
          <span>
            <b>
              {vetSummary.overdue > 0
                ? `${vetSummary.overdue} overdue vet item${vetSummary.overdue === 1 ? '' : 's'}`
                : vetSummary.dueSoon > 0
                  ? `${vetSummary.dueSoon} vet item${vetSummary.dueSoon === 1 ? '' : 's'} due in 7 days`
                  : 'No upcoming vet items'}
            </b>
            <small>Tap to open Vet Calendar</small>
          </span>
        </button>

        <small>Choose a round to start today's care.</small>
      </section>

      <section>
        <h2 className="roundSectionLabel">Start a Round</h2>

        <div className="roundStartList cleanRoundGrid">
          <RoundCard
            icon={ClipboardCheck}
            title="AM Care Round"
            subtitle={amUnlocked ? 'Cleaning, Feeding, Water' : 'Available at 8AM'}
            count={amUnlocked ? `${amPercent}% complete` : 'Not yet available'}
            complete={false}
            tone="green"
            disabled={!amUnlocked}
            onClick={() => {
              if (amUnlocked) startRound('care', 'AM');
            }}
          />

          <RoundCard
            icon={ClipboardCheck}
            title="PM Care Round"
            subtitle={pmUnlocked ? 'Cleaning, Feeding, Water' : 'Available at 3PM'}
            count={pmUnlocked ? `${pmPercent}% complete` : 'Not yet available'}
            complete={false}
            tone="blue"
            disabled={!pmUnlocked}
            onClick={() => {
              if (pmUnlocked) startRound('care', 'PM');
            }}
          />

          <RoundCard
            icon={Pill}
            title="Medication Round"
            subtitle={`${medTotal - medDoneCount} medication${(medTotal - medDoneCount) === 1 ? '' : 's'} due`}
            count={`${medPercent}% complete`}
            complete={medComplete}
            tone="purple"
            onClick={() => startRound('med', 'AM')}
          />

          <RoundCard
            icon={ClipboardCheck}
            title="Quarantine Checklist"
            subtitle="AM / PM room procedures"
            complete={checklistComplete}
            tone="purple"
            badges={checklistBadges}
            onClick={() => setPage('quarantine-checklist')}
          />
        </div>
      </section>

      <section className="roundGlancePanel cleanStatsPanel">
        <h2 className="roundSectionLabel">Today at a glance</h2>

        <div className="roundGlanceGrid cleanStatsGrid">
          <GlanceCard label="Tasks Due" value={careTasks.length} tone="green" />
          <GlanceCard label="Meds Due" value={medTotal - medDoneCount} tone="blue" />
          <GlanceCard label="Cats" value={animals.length} tone="white" />
        </div>
      </section>
    </main>
  );
}
