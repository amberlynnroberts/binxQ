import React, { useEffect, useMemo, useState } from 'react';
import { fetchCleaningSignoffsForDate } from '../lib/dailyCareStatusApi';
import { fetchDailyCareSignoffs } from '../lib/dailyCareApi';
import { currentHour, getMissingCleaningTasks, todayDateString } from '../lib/careTaskRules';
import {
  Bell,
  CheckCircle2,
  ClipboardCheck,
  ChevronRight,
  ClipboardList,
  PackageOpen,
  PawPrint,
  Pill,
  Sun,
  Moon,
} from 'lucide-react';
import { fetchUpcomingVetEvents, summarizeVetEvents } from '../lib/vetEventsApi';
import { fetchDailyReport } from '../lib/reportsApi';
import { medNeededForShift } from '../lib/medUtils';
import { isQuarantineAnimal, isInRescueAnimal } from '../lib/animalFilters';
import { AdminBulkSignoffModal } from '../components/AdminBulkSignoffModal';

// Two taps on the clipboard icon within this window count as a double-tap;
// anything slower is treated as two separate single taps.
const DOUBLE_TAP_MS = 400;

function RoundCard({ icon: Icon, title, subtitle, tone, onClick, complete, disabled, percent, onIconTap }) {
  const showRail = typeof percent === 'number' && !disabled;
  return (
    <button
      type="button"
      className={`roundStartCard ${tone || ''} ${complete ? 'done' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span className="roundStartIconWrap">
        <span
          className="roundStartIcon"
          onClick={onIconTap ? (e) => { e.stopPropagation(); onIconTap(); } : undefined}
        >
          <Icon size={26} />
        </span>
        {complete && (
          <span className="roundCompleteBadge">
            <CheckCircle2 size={14} />
          </span>
        )}
      </span>

      <span style={{ display: 'grid', minWidth: 0 }}>
        <b>{title}</b>
        <small>{subtitle}</small>
        {showRail && (
          <span className="roundRail" aria-hidden="true">
            <span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
          </span>
        )}
      </span>

      <ChevronRight size={20} />
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
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function RoundsDashboard({ data, allAnimals, setPage, startRound }) {
  const [cleaningSignoffs, setCleaningSignoffs] = useState([]);
  const [medSignoffsAM, setMedSignoffsAM] = useState({ cleaning: [], medication: [] });
  const [medSignoffsPM, setMedSignoffsPM] = useState({ cleaning: [], medication: [] });
  const [upcomingVetEvents, setUpcomingVetEvents] = useState([]);
  const [checklistSignoffs, setChecklistSignoffs] = useState({ AM: null, PM: null });

  // Tracks the timestamp of the last tap on each shift's clipboard icon, so
  // a second tap within DOUBLE_TAP_MS can be recognized as the secret
  // bulk-complete trigger rather than two normal single taps.
  const [lastIconTap, setLastIconTap] = useState({ AM: 0, PM: 0 });
  const [adminShift, setAdminShift] = useState(null);

  const animals = data?.animals || [];
  const meds = (data?.meds || []).filter(m => m.active);

  // PERFORMANCE FIX: previously fetched its own broader animal list on
  // every mount — a duplicate of the app-wide fetch App.jsx already does.
  // Now that api.js always returns every animal in that one shared fetch,
  // App.jsx passes the raw complete list down as `allAnimals` (separate
  // from `data.animals`, which is filtered by whichever tab is currently
  // selected elsewhere) — no separate fetch needed here at all.
  const allAnimalsBroad = allAnimals || [];

  // FIXED: previously counted every active medication regardless of which
  // animal it belonged to — so a cat moved to Foster (or anywhere else)
  // but still holding an old active medication record would inflate the
  // total denominator, dragging the percentage down even though every
  // medication actually relevant to today's rounds was fully given.
  const relevantAnimalIds = useMemo(() => {
    return new Set(
      allAnimalsBroad
        .filter(a => isQuarantineAnimal(a) || isInRescueAnimal(a))
        .map(a => a.id)
    );
  }, [allAnimalsBroad]);

  const relevantMeds = useMemo(() => {
    if (allAnimalsBroad.length === 0) return meds; // haven't loaded yet — don't filter everything out
    return meds.filter(m => relevantAnimalIds.has(m.animalId));
  }, [meds, relevantAnimalIds, allAnimalsBroad.length]);

  function refreshCleaningSignoffs() {
    fetchCleaningSignoffsForDate(todayDateString())
      .then(setCleaningSignoffs)
      .catch(console.error);
  }

  function refreshMedSignoffs() {
    const careDate = todayDateString();
    return Promise.all([
      fetchDailyCareSignoffs({ careDate, shift: 'AM' }),
      fetchDailyCareSignoffs({ careDate, shift: 'PM' }),
    ])
      .then(([am, pm]) => {
        setMedSignoffsAM(am);
        setMedSignoffsPM(pm);
      })
      .catch(console.error);
  }

  useEffect(() => {
    refreshCleaningSignoffs();
  }, [animals.length]);

  useEffect(() => {
    refreshMedSignoffs();
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

  // careTasks only lists what's still MISSING, so "done" means nothing
  // left for that shift (the old check required missing tasks > 0 AND
  // remaining === 0, which could never both be true).
  const amComplete = amUnlocked && totalCats > 0 && amRemaining === 0;
  const pmComplete = pmUnlocked && totalCats > 0 && pmRemaining === 0;

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

    for (const med of relevantMeds) {
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
  }, [relevantMeds, medSignoffsAM, medSignoffsPM]);

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

  // Secret bulk sign-off: a double-tap on a care round's clipboard icon
  // (not the card itself, so a single tap still navigates as normal) opens
  // the admin modal, which requires a name pick before
  // marking every quarantine cat's cleaning AND that shift's meds complete.
  function handleCareIconTap(shift) {
    if (adminShift) return;
    const now = Date.now();
    const last = lastIconTap[shift] || 0;
    setLastIconTap(prev => ({ ...prev, [shift]: now }));

    if (now - last < DOUBLE_TAP_MS) {
      setLastIconTap(prev => ({ ...prev, [shift]: 0 }));
      setAdminShift(shift);
    }
  }

  const checklistDoneCount = Number(Boolean(checklistSignoffs.AM)) + Number(Boolean(checklistSignoffs.PM));

  return (
    <main className="roundsDashboard">
      <header className="todayHeader">
        <div>
          <span className="brandMark"><PawPrint size={16}/> Binx Q</span>
          <h1>{greeting}</h1>
          <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

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
        <Bell size={20} />
        <span>
          <b>
            {vetSummary.overdue > 0
              ? `${vetSummary.overdue} overdue vet item${vetSummary.overdue === 1 ? '' : 's'}`
              : vetSummary.dueSoon > 0
                ? `${vetSummary.dueSoon} vet item${vetSummary.dueSoon === 1 ? '' : 's'} due this week`
                : 'Nothing due at the vet this week'}
          </b>
          <small>Open vet calendar</small>
        </span>
        <ChevronRight size={18} />
      </button>

      <h2 className="sectionLabel">Rounds</h2>
      <div className="roundStartList">
        <RoundCard
          icon={Sun}
          title="AM care round"
          subtitle={amUnlocked ? `Clean, feed, water · ${amPercent}% done` : 'Opens at 8 AM'}
          percent={amUnlocked ? amPercent : null}
          complete={amComplete}
          tone="gold"
          disabled={!amUnlocked}
          onClick={() => { if (amUnlocked) startRound('care', 'AM'); }}
          onIconTap={() => handleCareIconTap('AM')}
        />

        <RoundCard
          icon={Moon}
          title="PM care round"
          subtitle={pmUnlocked ? `Clean, feed, water · ${pmPercent}% done` : 'Opens at 3 PM'}
          percent={pmUnlocked ? pmPercent : null}
          complete={pmComplete}
          tone="gold"
          disabled={!pmUnlocked}
          onClick={() => { if (pmUnlocked) startRound('care', 'PM'); }}
          onIconTap={() => handleCareIconTap('PM')}
        />

        <RoundCard
          icon={Pill}
          title="Medication round"
          subtitle={medTotal - medDoneCount > 0
            ? `${medTotal - medDoneCount} dose${(medTotal - medDoneCount) === 1 ? '' : 's'} left today`
            : 'All doses given today'}
          percent={medPercent}
          complete={medComplete}
          tone="blue"
          onClick={() => startRound('med', 'AM')}
        />

        <RoundCard
          icon={ClipboardCheck}
          title="Quarantine room checklist"
          subtitle={`AM ${checklistSignoffs.AM ? 'done' : 'not done'} · PM ${checklistSignoffs.PM ? 'done' : 'not done'}`}
          percent={checklistDoneCount * 50}
          complete={checklistComplete}
          tone="purple"
          onClick={() => setPage('quarantine-checklist')}
        />
      </div>

      <h2 className="sectionLabel">Today so far</h2>
      <div className="roundGlanceGrid">
        <GlanceCard label="Care tasks left" value={careTasks.length} tone="green" />
        <GlanceCard label="Doses left" value={medTotal - medDoneCount} tone="blue" />
        <GlanceCard label="Cats in kennels" value={totalCats} tone="white" />
      </div>

      <div className="quickActions">
        <button type="button" className="quickAction" onClick={() => setPage('text-alert')}>
          <PackageOpen size={20}/> Low stock
        </button>
        <button type="button" className="quickAction" onClick={() => setPage('vet-day-list')}>
          <ClipboardList size={20}/> Vet day list
        </button>
      </div>

      {adminShift && (
        <AdminBulkSignoffModal
          shift={adminShift}
          allAnimals={allAnimalsBroad}
          meds={relevantMeds}
          onClose={() => setAdminShift(null)}
          onDone={async () => {
            refreshCleaningSignoffs();
            await refreshMedSignoffs();
          }}
        />
      )}
    </main>
  );
}
