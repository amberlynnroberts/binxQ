import React, { useRef, useState } from 'react';
import { Camera, Trash2, Upload } from 'lucide-react';
import { uploadAnimalPhoto, removeAnimalPhoto } from '../lib/api';

export function AnimalThumb({ animal }) {
  return (
    <span className="pet">
      {animal.photo?.startsWith('http') ? <img className="photoThumb" src={animal.photo} alt={animal.name} /> : animal.photo}
    </span>
  );
}

export function PhotoUploader({ animal, reload }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hasPhoto = animal.photo?.startsWith('http');

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await uploadAnimalPhoto({ animalId: animal.id, shelterluvId: animal.shelterluv_id, file });
      await reload();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function removePhoto() {
    if (!window.confirm(`Remove photo for ${animal.name}?`)) return;
    setBusy(true);
    setError('');
    try {
      await removeAnimalPhoto({ shelterluvId: animal.shelterluv_id });
      await reload();
    } catch (err) {
      setError(err.message || 'Remove failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2><Camera size={18}/> Photo</h2>
      {hasPhoto ? <img className="animalPhotoLarge" src={animal.photo} alt={animal.name} /> : <div className="photoPlaceholder">🐱</div>}
      {error && <p className="error">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} hidden />
      <div className="quick">
        <button type="button" className="primary" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Upload size={16}/> {busy ? 'Uploading...' : 'Upload Photo'}
        </button>
        {hasPhoto && <button type="button" className="danger" disabled={busy} onClick={removePhoto}><Trash2 size={16}/> Remove</button>}
      </div>
    </section>
  );
}
