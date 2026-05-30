import React, { useState } from 'react';
import { X } from 'lucide-react';
import emailjs from '@emailjs/browser';

export default function FeedbackModal({ onClose }) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('Bug');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

async function submit(e) {
  e.preventDefault();
  setSending(true);
  try {
    await emailjs.send(
      'service_spjq8a9',
      'template_0iwi5qp',
      {
        feedback_type: type,
        message: message,
        page: window.location.pathname
      },
      'Ya-xqPLmWgxqIG1J6'
    );
    setDone(true);
  } catch (err) {
    console.error(err);
    alert('Failed to send');
  } finally {
    setSending(false);
  }
}

  return (
    <div className="modalOverlay">
      <div className="modalCard">
        <div className="modalHeader">
          <h2>Send Feedback</h2>
          <button onClick={onClose}><X/></button>
        </div>

        {done ? (
          <p className="success">Thanks! I’ll take a look.</p>
        ) : (
          <form onSubmit={submit}>
            <label>
              Type
              <select value={type} onChange={e => setType(e.target.value)}>
                <option>Bug</option>
                <option>Feature Request</option>
                <option>General Feedback</option>
              </select>
            </label>

            <label>
              Message
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="What’s broken or what do you want?"
                required
              />
            </label>

            <button className="primary" disabled={sending}>
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}