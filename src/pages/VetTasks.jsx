import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Plus, Syringe, Trash2 } from 'lucide-react';
import { isInCustodyAnimal } from '../lib/animalFilters';
import { addVetTask, completeVetTask, deleteVetTask, fetchVetTasks, todayDateString } from '../lib/vetTasksApi';

const blankTask = {
  animalId: '',
  taskType: 'Vaccine',
  taskName: '',
  dueDate: todayDateString(),
  notes: ''
};

function getAnimalName(animals, animalId) {
  return animals.find(a => a.id === animalId)?.name || 'Unknown';
}

function getAnimalKennel(animals, animalId) {
  return animals.find(a => a.id === animalId)?.kennel || 'Unassigned';
}

export function VetTasks({ data, setPage }) {
  // Filter to only in-custody animals (exclude Deceased and Healthy in home)
  const animals = useMemo(() => {
    return (data?.animals || []).filter(isInCustodyAnimal);
  }, [data]);

  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(blankTask);
  const [message, setMessage] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [completedBy, setCompletedBy] = useState('');

  async function load() {
    const rows = await fetchVetTasks({ includeCompleted: false });
    setTasks(rows);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const upcoming = useMemo(() => {
    const today = todayDateString();
    const end = new Date(`${today}T00:00:00`);
    end.setDate(end.getDate() + 7);
    const endString = end.toISOString().slice(0, 10);

    return tasks.filter(task =>
      !task.completed &&
      task.due_date >= today &&
      task.due_date <= endString
    );
  }, [tasks]);

  const later = useMemo(() => {
    const upcomingIds = new Set(upcoming.map(t => t.id));
    return tasks.filter(task => !upcomingIds.has(task.id));
  }, [tasks, upcoming]);

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function submitTask(e) {
    e.preventDefault();
    setMessage('');

    try {
      await addVetTask({
        animalId: form.animalId,
        taskType: form.taskType,
        taskName: form.taskName,
        dueDate: form.dueDate,
        notes: form.notes
      });

      setForm(blankTask);
      setShowAdd(false);
      setMessage('Vet task added.');
      await load();
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Could not add vet task.');
    }
  }

  async function markComplete(taskId) {
    try {
      await completeVetTask({ taskId, completedBy: completedBy || 'Unknown' });
      setMessage('Vet task completed.');
      await load();
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Could not complete task.');
    }
  }

  async function removeTask(taskId) {
    if (!window.confirm('Delete this vet task?')) return;
    await deleteVetTask(taskId);
    setMessage('Vet task deleted.');
    await load();
  }

  function TaskCard({ task }) {
    return (
      <div className="vetTaskCard">
        <div className="vetTaskIcon"><Syringe size={22}/></div>

        <div className="vetTaskMain">
          <b>{task.task_name}</b>
          <small>{task.task_type} · Due {task.due_date}</small>
          <small>{getAnimalName(animals, task.animal_id)} · {getAnimalKennel(animals, task.animal_id)}</small>
          {task.notes && <p>{task.notes}</p>}
        </div>

        <div className="vetTaskActions">
          <button type="button" onClick={() => markComplete(task.id)} title="Complete">
            <CheckCircle2 size={18}/>
          </button>
          <button type="button" onClick={() => removeTask(task.id)} title="Delete">
            <Trash2 size={18}/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="vetTasksPage">
      <div className="roundsTop">
        <button type="button" className="roundsClose" onClick={() => setPage('dashboard')}>
          <ArrowLeft size={20}/>
        </button>
        <h1>Vet Day</h1>
        <span/>
      </div>

      <section className="vetHero">
        <div>
          <p>Upcoming</p>
          <h2>Vet Tasks & Vaccines</h2>
          <small>Shows tasks due in the next 7 days.</small>
        </div>
        <CalendarDays size={34}/>
      </section>

      <section className="vetToolbar">
        <button type="button" className="roundPrimary" onClick={() => setShowAdd(prev => !prev)}>
          <Plus size={18}/> Add Vet Task
        </button>

        <label>
          Completed By
          <input value={completedBy} onChange={e => setCompletedBy(e.target.value)} placeholder="Initials" />
        </label>
      </section>

      {message && <p className="success">{message}</p>}

      {showAdd && (
        <form className="vetTaskForm" onSubmit={submitTask}>
          <label>Cat
            <select value={form.animalId} onChange={e => setField('animalId', e.target.value)}>
              <option value="">Select cat...</option>
              {animals.map(animal => (
                <option key={animal.id} value={animal.id}>{animal.name} — {animal.kennel || 'Unassigned'}</option>
              ))}
            </select>
          </label>

          <label>Type
            <select value={form.taskType} onChange={e => setField('taskType', e.target.value)}>
              <option>Vaccine</option>
              <option>Vet Check</option>
              <option>Booster</option>
              <option>Fecal</option>
              <option>Spay/Neuter</option>
              <option>Other</option>
            </select>
          </label>

          <label>Task Name
            <input value={form.taskName} onChange={e => setField('taskName', e.target.value)} placeholder="FVRCP booster" />
          </label>

          <label>Due Date
            <input type="date" value={form.dueDate} onChange={e => setField('dueDate', e.target.value)} />
          </label>

          <label>Notes
            <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Optional notes..." rows="3" />
          </label>

          <button className="roundPrimary">Save Vet Task</button>
        </form>
      )}

      <section className="vetPanel">
        <div className="vetPanelTitle"><h2>Due in Next 7 Days</h2><span>{upcoming.length}</span></div>
        {upcoming.length === 0 ? <p className="vetEmpty">No vet tasks due in the next 7 days.</p> : (
          <div className="vetTaskList">{upcoming.map(task => <TaskCard key={task.id} task={task}/>)}</div>
        )}
      </section>

      <section className="vetPanel">
        <div className="vetPanelTitle"><h2>Later</h2><span>{later.length}</span></div>
        {later.length === 0 ? <p className="vetEmpty">No later vet tasks.</p> : (
          <div className="vetTaskList">{later.map(task => <TaskCard key={task.id} task={task}/>)}</div>
        )}
      </section>
    </main>
  );
}
