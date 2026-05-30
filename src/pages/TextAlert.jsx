import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Users
} from 'lucide-react';
import {
  addTextRecipient,
  buildTextMessage,
  deleteTextRecipient,
  fetchTextRecipients,
  updateTextRecipient
} from '../lib/prefilledTextApi';

const blankAlert = {
  alert_type: 'Low Supply',
  item_name: '',
  current_amount: '',
  concern_type: 'Not eating',
  animal_or_kennel: '',
  urgency: 'Normal',
  location: 'Quarantine room',
  submitted_by: '',
  notes: ''
};

const blankRecipient = {
  name: '',
  phone_number: ''
};

const commonSupplyItems = [
  'Cat litter',
  'Wet food',
  'Dry food',
  'Gloves',
  'Paper towels',
  'Bleach',
  'Rescue disinfectant',
  'Trash bags',
  'Laundry detergent',
  'Towels',
  'Pee pads',
  'Syringes',
  'Other, see notes'
];

export function TextAlert() {
  const [alertForm, setAlertForm] = useState(blankAlert);
  const [recipientForm, setRecipientForm] = useState(blankRecipient);
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [currentRecipientIndex, setCurrentRecipientIndex] = useState(null);
  const [sendQueue, setSendQueue] = useState([]);

  const setAlert = (key, value) => setAlertForm(prev => ({ ...prev, [key]: value }));
  const setRecipient = (key, value) => setRecipientForm(prev => ({ ...prev, [key]: value }));

  async function loadRecipients() {
    const rows = await fetchTextRecipients();
    setRecipients(rows);
    setSelectedRecipientIds(prev => {
      const activeIds = rows.filter(r => r.active).map(r => r.id);
      const stillValid = prev.filter(id => activeIds.includes(id));
      return stillValid.length ? stillValid : activeIds;
    });
  }

  useEffect(() => {
    loadRecipients().catch(console.error);
  }, []);

  const activeRecipients = recipients.filter(r => r.active);
  const selectedRecipients = recipients.filter(r => selectedRecipientIds.includes(r.id) && r.active);
  const previewMessage = useMemo(() => buildTextMessage(alertForm), [alertForm]);

  function showTemporaryMessage(text) {
    setMessage(text);
    setTimeout(() => setMessage(''), 5000);
  }

  function sendToNext(index, queue) {
    if (index >= queue.length) {
      setCurrentRecipientIndex(null);
      setSendQueue([]);
      showTemporaryMessage('All messages opened!');
      return;
    }

    const recipient = queue[index];
    const encoded = encodeURIComponent(buildTextMessage(alertForm));
    const link = `sms:${recipient.phone_number}?&body=${encoded}`;

    const a = document.createElement('a');
    a.href = link;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setCurrentRecipientIndex(index + 1);
  }

  function toggleSelected(id) {
    setSelectedRecipientIds(prev =>
      prev.includes(id)
        ? prev.filter(existing => existing !== id)
        : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedRecipientIds(activeRecipients.map(r => r.id));
  }

  function clearAll() {
    setSelectedRecipientIds([]);
  }

  async function addRecipient(e) {
    e.preventDefault();
    setMessage('');
    try {
      setBusy(true);
      const added = await addTextRecipient(recipientForm);
      setRecipientForm(blankRecipient);
      setShowAddPerson(false);
      showTemporaryMessage('Recipient added.');
      await loadRecipients();
      setSelectedRecipientIds(prev => [...new Set([...prev, added.id])]);
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Failed to add recipient.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecipientActive(recipient) {
    await updateTextRecipient(recipient.id, { active: !recipient.active });
    await loadRecipients();
  }

  async function removeRecipient(id) {
    if (!window.confirm('Remove this recipient?')) return;
    await deleteTextRecipient(id);
    await loadRecipients();
  }

  return (
    <main>
      <h1>Low Stock Alert</h1>

      <section className="panel recipientPicker">
        <div className="title">
          <h2><Users size={18} /> Send To</h2>
          <button type="button" className="link" onClick={() => setShowAddPerson(prev => !prev)}>
            <Plus size={16} />
            Add Person
          </button>
        </div>

        <div className="recipientToolbar">
          <span>{selectedRecipients.length} selected</span>
          <div className="quick">
            <button type="button" className="link" onClick={selectAll}>Select All</button>
            <button type="button" className="link" onClick={clearAll}>Clear</button>
          </div>
        </div>

        {activeRecipients.length === 0 && (
          <p className="emptyMini">No active recipients yet. Add someone below.</p>
        )}

        <div className="recipientChecklist">
          {activeRecipients.map(recipient => (
            <div className="recipientCheck" key={recipient.id}>
              <label className="recipientMain">
                <input
                  type="checkbox"
                  checked={selectedRecipientIds.includes(recipient.id)}
                  onChange={() => toggleSelected(recipient.id)}
                />
                <span>
                  <b>{recipient.name || 'Unnamed'}</b>
                  <small>{recipient.phone_number}</small>
                </span>
              </label>
              <div className="recipientActions">
                <button
                  type="button"
                  className="danger"
                  onClick={() => removeRecipient(recipient.id)}
                  title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {showAddPerson && (
          <form className="inlineAddPerson" onSubmit={addRecipient}>
            <label>Name
              <input
                value={recipientForm.name}
                onChange={e => setRecipient('name', e.target.value)}
                placeholder="Manager Name"
              />
            </label>
            <label>Phone Number
              <input
                value={recipientForm.phone_number}
                onChange={e => setRecipient('phone_number', e.target.value)}
                placeholder="8288675309"
              />
            </label>
            <button className="primary full" disabled={busy}>
              <Plus size={16} />
              {busy ? 'Adding...' : 'Add & Select'}
            </button>
          </form>
        )}
      </section>

      <form className="panel form" onSubmit={e => e.preventDefault()}>
        <h2><MessageSquare size={18} /> Low Supply Request</h2>

        {message && (
          <p className={message.includes('Opening') || message.includes('added') || message.includes('All') ? 'success' : 'error'}>
            {message.includes('Opening') || message.includes('added') || message.includes('All') ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {message}
          </p>
        )}

        <label>Supply Item
          <input
            list="common-supply-items"
            value={alertForm.item_name}
            onChange={e => setAlert('item_name', e.target.value)}
            placeholder="Cat litter"
          />
          <datalist id="common-supply-items">
            {commonSupplyItems.map(item => <option key={item} value={item} />)}
          </datalist>
        </label>

        <label>Amount Left
          <input
            value={alertForm.current_amount}
            onChange={e => setAlert('current_amount', e.target.value)}
            placeholder="1 bag left"
          />
        </label>

        <label>Urgency
          <select value={alertForm.urgency} onChange={e => setAlert('urgency', e.target.value)}>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
            <option>Emergency</option>
          </select>
        </label>

        <label>Location
          <select value={alertForm.location} onChange={e => setAlert('location', e.target.value)}>
            <option>Quarantine room</option>
            <option>Cat room</option>
            <option>Dog area</option>
            <option>Laundry</option>
            <option>Med station</option>
            <option>Office</option>
            <option>Other</option>
          </select>
        </label>

        <label>Submitted By
          <input
            value={alertForm.submitted_by}
            onChange={e => setAlert('submitted_by', e.target.value)}
            placeholder="Initials or name"
          />
        </label>

        <label>Notes
          <textarea
            value={alertForm.notes}
            onChange={e => setAlert('notes', e.target.value)}
            placeholder="Add details..."
            rows="3"
          />
        </label>

        <section className="messagePreview">
          <b>Message Preview</b>
          <pre>{previewMessage}</pre>
        </section>
      </form>

      {currentRecipientIndex !== null && currentRecipientIndex <= sendQueue.length ? (
        currentRecipientIndex === sendQueue.length ? (
          <button
            className="primary full"
            type="button"
            onClick={() => {
              setCurrentRecipientIndex(null);
              setSendQueue([]);
              showTemporaryMessage('All messages opened!');
            }}>
            <Send size={16} />
            Done ✓
          </button>
        ) : (
          <button
            className="primary full"
            type="button"
            onClick={() => sendToNext(currentRecipientIndex, sendQueue)}>
            <Send size={16} />
            Next: Text {sendQueue[currentRecipientIndex]?.name} ({currentRecipientIndex + 1}/{sendQueue.length})
          </button>
        )
      ) : (
        <button
          className="primary full"
          type="button"
          disabled={busy}
          onClick={() => {
            if (!alertForm.item_name.trim()) {
              setMessage('Please enter a supply item.');
              return;
            }
            if (selectedRecipients.length === 0) {
              setMessage('Select at least one person to text.');
              return;
            }
            const queue = [...selectedRecipients];
            setSendQueue(queue);
            sendToNext(0, queue);
          }}>
          <Send size={16} />
          {busy ? 'Opening...' : `Open Messages App (${selectedRecipients.length})`}
        </button>
      )}

    </main>
  );
}