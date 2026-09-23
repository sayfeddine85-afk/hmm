// Export / import CSV des pesées.

import { dateToISO } from './dates';

// Construit le CSV exporté : date,poids,ma5
export const buildCSV = (entries) =>
  ['date,poids,ma5']
    .concat(entries.map((e) => `${e.date},${e.poids},${e.ma5 != null ? e.ma5.toFixed(2) : ''}`))
    .join('\n');

const pad = (n) => String(n).padStart(2, '0');

// Accepte "2026-03-08", "08/03/2026", "8/3/26", "08/03" (année courante).
export const parseDate = (raw, currentYear = new Date().getFullYear()) => {
  const s = raw.trim().replace(/^"|"$/g, '');
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return build(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (m) {
    let y = m[3] ? +m[3] : currentYear;
    if (y < 100) y += 2000;
    return build(y, +m[2], +m[1]);
  }
  return null;
};

const build = (y, mo, d) => {
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
};

// Parse un CSV (séparateur , ou ; — virgule décimale acceptée avec ;).
// Retourne { entries, errors } ; les doublons de date gardent la dernière valeur.
export const parseCSV = (text) => {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const byDate = new Map();
  const errors = [];
  lines.forEach((line, idx) => {
    const sep = line.includes(';') ? ';' : ',';
    const cols = line.split(sep);
    if (idx === 0 && /date/i.test(cols[0])) return;
    const date = parseDate(cols[0] ?? '');
    const poids = parseFloat((cols[1] ?? '').trim().replace(/^"|"$/g, '').replace(',', '.'));
    if (!date || !Number.isFinite(poids) || poids < 30 || poids > 250) {
      errors.push(idx + 1);
      return;
    }
    byDate.set(date, { date, poids: Math.round(poids * 10) / 10 });
  });
  const entries = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  return { entries, errors };
};

export const exportFileName = () => `poids-suivi-${dateToISO(new Date())}.csv`;
