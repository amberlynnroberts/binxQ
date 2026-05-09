import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function Stat({ n, t, kind }) {
  return <div className={'stat ' + kind}><b>{n}</b><small>{t}</small></div>;
}

export function Empty({ text }) {
  return <div className="empty"><AlertTriangle size={18}/>{text}</div>;
}

export function kennelShort(k) {
  const n = String(k || '').match(/\d+/)?.[0];
  return n || '?';
}
