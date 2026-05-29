import React, { useState, useEffect } from 'react';

const PASSCODE = '841806';

const STORAGE_KEY = 'binx_passcode_auth';
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function isValidSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  try {
    const { time } = JSON.parse(raw);
    return Date.now() - time < EXPIRY_MS;
  } catch {
    return false;
  }
}

export default function PasscodeGate({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isValidSession()) {
      setAuthorized(true);
    }
  }, []);

  function submit(e) {
    e.preventDefault();

    if (code === PASSCODE) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ time: Date.now() })
      );
      setAuthorized(true);
    } else {
      setError('Incorrect passcode');
      setCode('');
    }
  }

  if (authorized) return children;

  return (
    <div className="passcodeGate">
      <form onSubmit={submit} className="passcodeCard">
        <h1>🔒 Secure Access</h1>
        <p>Enter passcode to continue</p>

        <input
          type="password"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Enter passcode"
          autoFocus
        />

        {error && <p className="error">{error}</p>}

        <button className="primary">Unlock</button>
      </form>
    </div>
  );
}